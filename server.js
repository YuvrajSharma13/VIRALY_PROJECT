require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const { performance } = require('perf_hooks');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MAX_SOURCE_CHARACTERS = 60000;
const allowedFormats = new Set(['twitter', 'linkedin', 'instagram', 'reel', 'hashtags', 'script', 'answer']);
const localStorePath = path.join(__dirname, 'data', 'viraly-history.json');

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

const PostSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  sourceType: { type: String, default: 'text' },
  sourceInput: String,
  customInstructions: String,
  generatedContent: String,
  selectedFormats: [String],
  selectedTone: String,
  latency: Number,
  createdAt: { type: Date, default: Date.now },
});
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/viraly')
  .then(() => console.log('MongoDB connected.'))
  .catch((error) => console.warn(`MongoDB unavailable; generations will still work but will not be saved: ${error.message}`));

function isYouTubeUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    return host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com';
  } catch {
    return false;
  }
}

async function extractPdfText(dataUrl) {
  const match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/s);
  if (!match) throw new Error('The uploaded PDF could not be read. Please upload a valid PDF file.');
  const parser = new PDFParse({ data: Buffer.from(match[1], 'base64') });
  try {
    const result = await parser.getText();
    const text = result?.text?.trim();
    if (!text) throw new Error('This PDF has no selectable text. Upload a text-based PDF or paste its content.');
    return text;
  } finally {
    await parser.destroy();
  }
}

async function readLocalHistory() {
  try {
    const contents = await fs.readFile(localStorePath, 'utf8');
    const records = JSON.parse(contents);
    return Array.isArray(records) ? records : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    console.warn(`Could not read local history: ${error.message}`);
    return [];
  }
}

async function saveLocally(record) {
  const records = await readLocalHistory();
  records.unshift({ ...record, _id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(localStorePath), { recursive: true });
  const temporaryPath = `${localStorePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(records.slice(0, 500), null, 2), 'utf8');
  await fs.rename(temporaryPath, localStorePath);
}

async function persistGeneration(record) {
  if (mongoose.connection.readyState === 1) {
    try {
      await Post.create(record);
      return 'mongodb';
    } catch (error) {
      console.warn(`MongoDB save failed; using local history: ${error.message}`);
    }
  }
  await saveLocally(record);
  return 'local';
}

function buildPrompt({ formats, tone, instructions, sourceText }) {
  const formatRules = {
    twitter: 'Twitter / X thread: 5–8 concise posts, a strong hook, and a final call to action.',
    linkedin: 'LinkedIn post: engaging opening, readable short paragraphs, practical insight, and a call to action.',
    instagram: 'Instagram caption: compelling hook, concise value, natural line breaks, and an optional call to action.',
    reel: 'Reel hook: give 5 short high-retention hooks, each under 15 words.',
    hashtags: 'Hashtags: provide 15 relevant, non-spammy hashtags in one line.',
    script: 'Short video script: Hook, Value, and Call to action. Keep it under 45 seconds.',
    answer: 'Direct answer: answer the user’s question clearly, accurately, and only from the supplied source.',
  };
  return `You are VIRALY, a precise content repurposing and video-analysis assistant.

Use only the provided source. Do not invent scenes, claims, timestamps, quotes, statistics, or events. If the requested information is not available, say so clearly.

User request: ${instructions || 'Create useful social content from this source.'}
Tone: ${tone}

Create these sections in Markdown, each with a clear ## heading:
${formats.map((format) => `- ${formatRules[format]}`).join('\n')}

Source material:
${sourceText || 'A public YouTube video was supplied separately. Analyze its audio and visual content directly.'}`;
}

async function generateWithGemini({ youtubeUrl, prompt }) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('GEMINI_API_KEY is missing. Add it to the backend .env file, then restart the server.');
    error.statusCode = 503;
    throw error;
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const input = youtubeUrl
    ? [{ type: 'text', text: prompt }, { type: 'video', uri: youtubeUrl }]
    : [{ type: 'text', text: prompt }];
  const response = await ai.interactions.create({ model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', input });
  const content = response.output_text?.trim();
  if (!content) throw new Error('Gemini returned an empty response. Please try again.');
  return content;
}

app.post('/api/generate', async (req, res) => {
  try {
    const { userId, sourceInput, sourceType = 'text', customInstructions = '', formats, tone = 'Professional' } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId is required to generate and save content." });
    }
    if (typeof sourceInput !== 'string' || !sourceInput.trim()) return res.status(400).json({ success: false, error: 'Add a YouTube URL, text, or supported document first.' });
    const selectedFormats = Array.isArray(formats) ? formats.filter((format) => allowedFormats.has(format)) : [];
    const activeFormats = selectedFormats.length ? selectedFormats : ['answer'];
    
    let sourceText = sourceInput.trim();
    let youtubeUrl = null;
    if (sourceType === 'pdf' || sourceInput.startsWith('data:application/pdf;base64,')) {
      sourceText = await extractPdfText(sourceInput);
    } else if (sourceType === 'youtube' || isYouTubeUrl(sourceText)) {
      if (!isYouTubeUrl(sourceText)) return res.status(400).json({ success: false, error: 'Please provide a valid public YouTube URL.' });
      youtubeUrl = sourceText;
      sourceText = '';
    }
    if (sourceText.length > MAX_SOURCE_CHARACTERS) sourceText = `${sourceText.slice(0, MAX_SOURCE_CHARACTERS)}\n\n[Source shortened for processing.]`;

    const start = performance.now();
    const content = await generateWithGemini({ youtubeUrl, prompt: buildPrompt({ formats: activeFormats, tone, instructions: customInstructions.trim(), sourceText }) });
    const latency = Math.round(performance.now() - start);
    const storage = await persistGeneration({ userId, sourceType: youtubeUrl ? 'youtube' : sourceType, sourceInput, customInstructions, generatedContent: content, selectedFormats: activeFormats, selectedTone: tone, latency });
    res.json({ success: true, content, meta: { sourceType: youtubeUrl ? 'youtube' : sourceType, formats: activeFormats, latency, storage } });
  } catch (error) {
    console.error('Generation error:', error.message);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Generation failed. Please try again.' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId query parameter is required.' });
    }

    let data;
    if (mongoose.connection.readyState === 1) {
      data = await Post.find({ userId }).sort({ createdAt: -1 }).limit(100).lean();
    } else {
      const localRecords = await readLocalHistory();
      data = localRecords.filter((record) => record.userId === userId);
    }

    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: 'Unable to retrieve history.' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId query parameter is required.' });
    }

    let logs;
    if (mongoose.connection.readyState === 1) {
      logs = await Post.find({ userId }).lean();
    } else {
      const localRecords = await readLocalHistory();
      logs = localRecords.filter((record) => record.userId === userId);
    }

    const platformCounts = {};
    const toneCounts = {};
    let latencyTotal = 0;
    logs.forEach((log) => {
      toneCounts[log.selectedTone || 'Professional'] = (toneCounts[log.selectedTone || 'Professional'] || 0) + 1;
      (log.selectedFormats || []).forEach((format) => { platformCounts[format] = (platformCounts[format] || 0) + 1; });
      latencyTotal += log.latency || 0;
    });
    res.json({ success: true, analytics: { totalGenerated: logs.length, platformCounts, toneCounts, totalEstimatedTokens: logs.reduce((sum, log) => sum + ((log.selectedFormats?.length || 0) * 80), 0), averageLatency: logs.length ? (latencyTotal / logs.length / 1000).toFixed(2) : '0.00', estimatedHoursSaved: Number((logs.length * 0.75).toFixed(1)) } });
  } catch {
    res.status(500).json({ success: false, error: 'Unable to build analytics.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'local' }));
app.listen(PORT, () => console.log(`VIRALY API running at http://localhost:${PORT}`));