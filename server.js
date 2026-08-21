require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
const Groq = require('groq-sdk');
const { YoutubeTranscript } = require('youtube-transcript');
const { getSubtitles } = require('youtube-caption-extractor');
const { performance } = require('perf_hooks');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MAX_SOURCE_CHARACTERS = 60000;
const allowedFormats = new Set(['twitter', 'linkedin', 'instagram', 'reel', 'hashtags', 'script', 'answer']);
const localStorePath = path.join(__dirname, 'data', 'viraly-history.json');

// Configure CORS
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim().replace(/\/$/, ''))
  : true;

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
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
  .then(() => console.log('MongoDB connected successfully.'))
  .catch((error) => console.warn(`MongoDB unavailable; falling back to local storage: ${error.message}`));

function extractVideoId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      return url.pathname.slice(1).split('?')[0].split('&')[0];
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.replace('/shorts/', '').split('?')[0].split('&')[0];
      }
      return url.searchParams.get('v');
    }
    return null;
  } catch {
    return null;
  }
}

function isYouTubeUrl(value) {
  return Boolean(extractVideoId(value));
}

async function extractYouTubeContent(url, customInstructions = '') {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Please provide a valid public YouTube URL.');
  }

  // 1. Try YoutubeTranscript
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    if (transcriptItems && transcriptItems.length > 0) {
      return transcriptItems.map((item) => item.text).join(' ');
    }
  } catch (err) {
    console.warn(`YoutubeTranscript error: ${err.message}`);
  }

  // 2. Try youtube-caption-extractor
  try {
    const captions = await getSubtitles({ videoID: videoId, lang: 'en' });
    if (captions && captions.length > 0) {
      return captions.map((item) => item.text).join(' ');
    }
  } catch (err) {
    console.warn(`youtube-caption-extractor error: ${err.message}`);
  }

  // 3. Fallback: Video metadata
  let meta = null;
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    if (data && data.title) {
      meta = { title: data.title, author: data.author_name || 'YouTube Creator' };
    }
  } catch (err) {
    console.warn(`Metadata fetch error: ${err.message}`);
  }

  if (meta) {
    if (customInstructions && customInstructions.trim()) {
      return `YouTube Video: "${meta.title}" by ${meta.author}.\n\nContext & Topic Details:\n${customInstructions.trim()}`;
    }
    return `YouTube Video: "${meta.title}" by ${meta.author}.\n\nRepurpose social media content based on this video topic.`;
  }

  throw new Error('Could not extract captions for this video. Please provide some brief notes in the Additional context box.');
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
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }
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
      console.warn(`MongoDB save failed; fallback to local history: ${error.message}`);
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

  return `You are VIRALY, a precise content repurposing and analysis assistant.

Use only the provided source. Do not invent scenes, claims, timestamps, quotes, statistics, or events. If the requested information is not available, say so clearly.

User request: ${instructions || 'Create useful social content from this source.'}
Tone: ${tone}

Create these sections in Markdown, each with a clear ## heading:
${formats.map((format) => `- ${formatRules[format]}`).join('\n')}

Source material:
${sourceText}`;
}

async function generateAI({ prompt }) {
  const errors = [];

  // --- 1. GEMINI ATTEMPTS (Preferred by user) ---
  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    // 1a. Try ai.interactions.create with gemini-3.5-flash-lite
    try {
      if (ai.interactions && typeof ai.interactions.create === 'function') {
        const res = await ai.interactions.create({
          model: geminiModel,
          input: [{ type: 'text', text: prompt }],
        });
        const content = (res.output_text || res.text || res.candidates?.[0]?.content?.parts?.[0]?.text)?.trim();
        if (content) return content;
      }
    } catch (err) {
      errors.push(`Gemini interactions error: ${err.message}`);
    }

    // 1b. Try ai.models.generateContent with specified model
    try {
      const res = await ai.models.generateContent({
        model: geminiModel,
        contents: prompt,
      });
      const content = res.text?.trim();
      if (content) return content;
    } catch (err) {
      errors.push(`Gemini models (${geminiModel}) error: ${err.message}`);
    }

    // 1c. Try fallback models (gemini-2.0-flash / gemini-1.5-flash)
    for (const fallbackModel of ['gemini-2.0-flash', 'gemini-1.5-flash']) {
      try {
        const res = await ai.models.generateContent({
          model: fallbackModel,
          contents: prompt,
        });
        const content = res.text?.trim();
        if (content) return content;
      } catch (err) {
        errors.push(`Gemini fallback (${fallbackModel}) error: ${err.message}`);
      }
    }
  }

  // --- 2. GROQ ATTEMPTS (Ultra-fast fallback) ---
  if (process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const groqModels = [
      process.env.GROQ_MODEL,
      'llama-3.1-8b-instant',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ].filter(Boolean);

    for (const model of groqModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are VIRALY, an expert content repurposing engine. You craft high-converting, polished social media content strictly following the formatting instructions given.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        });
        const content = completion.choices[0]?.message?.content?.trim();
        if (content) return content;
      } catch (err) {
        errors.push(`Groq (${model}) error: ${err.message}`);
      }
    }
  }

  throw new Error(`AI generation failed. Details: ${errors.join(' | ')}`);
}

app.post('/api/generate', async (req, res) => {
  try {
    const { userId, sourceInput, sourceType = 'text', customInstructions = '', formats, tone = 'Professional' } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required to generate and save content.' });
    }
    if (typeof sourceInput !== 'string' || !sourceInput.trim()) {
      return res.status(400).json({ success: false, error: 'Add a YouTube URL, text, or supported document first.' });
    }

    const selectedFormats = Array.isArray(formats) ? formats.filter((format) => allowedFormats.has(format)) : [];
    const activeFormats = selectedFormats.length ? selectedFormats : ['answer'];

    let sourceText = sourceInput.trim();
    let detectedSourceType = sourceType;

    if (sourceType === 'pdf' || sourceInput.startsWith('data:application/pdf;base64,')) {
      detectedSourceType = 'pdf';
      sourceText = await extractPdfText(sourceInput);
    } else if (sourceType === 'youtube' || isYouTubeUrl(sourceText)) {
      if (!isYouTubeUrl(sourceText)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid public YouTube URL.' });
      }
      detectedSourceType = 'youtube';
      sourceText = await extractYouTubeContent(sourceText, customInstructions);
    }

    if (sourceText.length > MAX_SOURCE_CHARACTERS) {
      sourceText = `${sourceText.slice(0, MAX_SOURCE_CHARACTERS)}\n\n[Source shortened for processing.]`;
    }

    const start = performance.now();
    const prompt = buildPrompt({ formats: activeFormats, tone, instructions: customInstructions.trim(), sourceText });
    const content = await generateAI({ prompt });
    const latency = Math.round(performance.now() - start);

    const storage = await persistGeneration({
      userId,
      sourceType: detectedSourceType,
      sourceInput,
      customInstructions,
      generatedContent: content,
      selectedFormats: activeFormats,
      selectedTone: tone,
      latency,
    });

    res.json({
      success: true,
      content,
      meta: { sourceType: detectedSourceType, formats: activeFormats, latency, storage },
    });
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
  } catch (error) {
    console.error('History error:', error.message);
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
      (log.selectedFormats || []).forEach((format) => {
        platformCounts[format] = (platformCounts[format] || 0) + 1;
      });
      latencyTotal += log.latency || 0;
    });

    res.json({
      success: true,
      analytics: {
        totalGenerated: logs.length,
        platformCounts,
        toneCounts,
        totalEstimatedTokens: logs.reduce((sum, log) => sum + ((log.selectedFormats?.length || 0) * 80), 0),
        averageLatency: logs.length ? (latencyTotal / logs.length / 1000).toFixed(2) : '0.00',
        estimatedHoursSaved: Number((logs.length * 0.75).toFixed(1)),
      },
    });
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(500).json({ success: false, error: 'Unable to build analytics.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'local' });
});

app.listen(PORT, () => console.log(`VIRALY API running at http://localhost:${PORT}`));