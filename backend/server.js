require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenAI } = require('@google/genai');
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

// --- Mongoose Schemas ---
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

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

// --- AUTHENTICATION & USER PROFILE ENDPOINTS ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(400).json({ success: false, error: 'An account with this email already exists!' });
      }
      const user = await User.create({ email: cleanEmail, password, name: cleanName });
      return res.json({
        success: true,
        user: { id: user._id, email: user.email, name: user.name },
      });
    } else {
      return res.json({
        success: true,
        user: { id: cleanEmail, email: cleanEmail, name: cleanName },
      });
    }
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Unable to create account.' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }
    const cleanEmail = email.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }
      return res.json({
        success: true,
        user: { id: user._id, email: user.email, name: user.name },
      });
    } else {
      return res.json({
        success: true,
        user: { id: cleanEmail, email: cleanEmail, name: cleanEmail.split('@')[0] },
      });
    }
  } catch (error) {
    console.error('Signin error:', error.message);
    res.status(500).json({ success: false, error: 'Unable to sign in.' });
  }
});

app.put('/api/auth/profile', async (req, res) => {
  try {
    const { currentEmail, newEmail, newName } = req.body;
    if (!currentEmail || !newEmail || !newName) {
      return res.status(400).json({ success: false, error: 'Current email, new email, and name are required.' });
    }
    const cleanCurrent = currentEmail.toLowerCase().trim();
    const cleanNew = newEmail.toLowerCase().trim();
    const cleanName = newName.trim();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: cleanCurrent });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }

      if (cleanNew !== cleanCurrent) {
        const existing = await User.findOne({ email: cleanNew });
        if (existing) {
          return res.status(400).json({ success: false, error: 'The new email address is already in use by another account.' });
        }
      }

      user.name = cleanName;
      user.email = cleanNew;
      await user.save();

      // If email changed, migrate all past posts to the new email
      if (cleanNew !== cleanCurrent) {
        await Post.updateMany({ userId: cleanCurrent }, { userId: cleanNew });
      }

      return res.json({
        success: true,
        user: { id: user._id, email: user.email, name: user.name },
      });
    } else {
      return res.json({
        success: true,
        user: { id: cleanNew, email: cleanNew, name: cleanName },
      });
    }
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({ success: false, error: error.message || 'Unable to update profile.' });
  }
});

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
    console.warn(`YoutubeTranscript warning: ${err.message}`);
  }

  // 2. Try youtube-caption-extractor
  try {
    const captions = await getSubtitles({ videoID: videoId, lang: 'en' });
    if (captions && captions.length > 0) {
      return captions.map((item) => item.text).join(' ');
    }
  } catch (err) {
    console.warn(`youtube-caption-extractor warning: ${err.message}`);
  }

  // 3. Metadata fallback
  let meta = null;
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    if (data && data.title) {
      meta = { title: data.title, author: data.author_name || 'YouTube Creator' };
    }
  } catch (err) {
    console.warn(`Metadata fetch warning: ${err.message}`);
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

async function generateWithGemini({ prompt }) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error('GEMINI_API_KEY is missing. Please add GEMINI_API_KEY in your Render Environment Variables.');
    error.statusCode = 503;
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  // 1. Try ai.interactions.create with gemini-3.5-flash-lite
  try {
    if (ai.interactions && typeof ai.interactions.create === 'function') {
      const response = await ai.interactions.create({
        model,
        input: [{ type: 'text', text: prompt }],
      });
      const content = (response.output_text || response.text || response.candidates?.[0]?.content?.parts?.[0]?.text)?.trim();
      if (content) return content;
    }
  } catch (err) {
    console.warn(`interactions.create fallback: ${err.message}`);
  }

  // 2. Try ai.models.generateContent with gemini-3.5-flash-lite
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    const content = response.text?.trim();
    if (content) return content;
  } catch (err) {
    console.warn(`models.generateContent fallback: ${err.message}`);
  }

  // 3. Try gemini-1.5-flash fallback if available
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    const content = response.text?.trim();
    if (content) return content;
  } catch (err) {
    console.warn(`gemini-1.5-flash fallback: ${err.message}`);
  }

  throw new Error('Gemini returned an empty response or could not process the request. Check your GEMINI_API_KEY in Render.');
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
    const content = await generateWithGemini({ prompt });
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

// --- CALENDAR ACTIVITY MAP ENDPOINT ---
app.get('/api/calendar', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId query parameter is required.' });
    }

    let posts;
    if (mongoose.connection.readyState === 1) {
      posts = await Post.find({ userId }).sort({ createdAt: -1 }).lean();
    } else {
      const localRecords = await readLocalHistory();
      posts = localRecords.filter((record) => record.userId === userId);
    }

    const calendar = {};
    posts.forEach((post) => {
      const dateKey = new Date(post.createdAt).toISOString().split('T')[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push({
        _id: post._id,
        sourceType: post.sourceType,
        sourceInput: post.sourceInput,
        customInstructions: post.customInstructions,
        generatedContent: post.generatedContent,
        selectedFormats: post.selectedFormats,
        selectedTone: post.selectedTone,
        createdAt: post.createdAt,
      });
    });

    res.json({
      success: true,
      calendar,
      stats: {
        totalPosts: posts.length,
        activeDays: Object.keys(calendar).length,
      },
    });
  } catch (error) {
    console.error('Calendar error:', error.message);
    res.status(500).json({ success: false, error: 'Unable to retrieve calendar data.' });
  }
});

// --- AI CONTENT SCHEDULE SUGGESTIONS ENDPOINT ---
app.post('/api/calendar/suggest', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required.' });
    }

    let recentPosts;
    if (mongoose.connection.readyState === 1) {
      recentPosts = await Post.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
    } else {
      const localRecords = await readLocalHistory();
      recentPosts = localRecords.filter((record) => record.userId === userId).slice(0, 10);
    }

    const pastTopics = recentPosts
      .map((p) => {
        const topic = p.customInstructions || p.sourceInput?.substring(0, 150) || 'General content';
        return `- Type: ${p.sourceType}, Formats: ${p.selectedFormats?.join(', ')}, Tone: ${p.selectedTone}, Topic: ${topic}`;
      })
      .join('\n');

    const prompt = `You are VIRALY AI Content Strategist.
Analyze the creator's historical content topics and themes:
${pastTopics || 'No previous history yet. Generate a viral, high-growth 7-day content schedule for a modern content creator / entrepreneur.'}

Create a personalized 7-day Content Schedule & Suggestions Plan for the upcoming week (Day 1 to Day 7).
For each day, provide:
1. Day & Strategic Theme (e.g. "Day 1 (Monday): Industry Mythbusting")
2. Recommended Post Angle & Title
3. Recommended Platform Format (e.g., twitter, linkedin, instagram, reel, script)
4. A high-converting Hook (under 20 words)
5. Topic Brief & Prompt (A 1-2 sentence instruction that the creator can use right away in the VIRALY studio)

Output pure JSON format only, structured as an array of 7 objects with the exact keys:
[
  {
    "day": "Day 1 (Monday)",
    "theme": "Industry Insight & Deep Dive",
    "title": "Title here",
    "format": "linkedin",
    "hook": "Hook sentence here",
    "brief": "Detailed prompt instruction for the studio here"
  }
]`;

    let suggestions = [];
    try {
      const aiContent = await generateWithGemini({ prompt });
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(aiContent);
      }
    } catch {
      suggestions = [
        {
          day: "Day 1 (Monday)",
          theme: "Authority & Deep Insight",
          title: "Core Lessons & Frameworks",
          format: "linkedin",
          hook: "Most people in this space make this fundamental mistake until it's too late.",
          brief: "Break down the top 3 principles that improved your workflow or niche expertise this month."
        },
        {
          day: "Day 2 (Tuesday)",
          theme: "Viral Hook / Short Video",
          title: "Quick-fire Reel / Short Script",
          format: "reel",
          hook: "3 signs you're doing this wrong in 2026 (and how to fix it):",
          brief: "Write a high-retention 30-second script breaking down a common pitfall and immediate fix."
        },
        {
          day: "Day 3 (Wednesday)",
          theme: "Step-by-step Playbook",
          title: "Actionable Twitter / X Thread",
          format: "twitter",
          hook: "How to master this topic in 5 simple steps (bookmark this thread):",
          brief: "Provide a 6-step actionable playbook with practical takeaways."
        },
        {
          day: "Day 4 (Thursday)",
          theme: "Behind The Scenes & Authenticity",
          title: "Visual Story & Instagram Caption",
          format: "instagram",
          hook: "What they don't tell you about building consistency behind the scenes:",
          brief: "A transparent, engaging breakdown of daily habits and systems."
        },
        {
          day: "Day 5 (Friday)",
          theme: "Weekly Synthesis & Curated Insights",
          title: "High-value Professional Recap",
          format: "linkedin",
          hook: "3 realizations that completely shifted my perspective this week:",
          brief: "Synthesize the most valuable insights from this week's experiments and research."
        },
        {
          day: "Day 6 (Saturday)",
          theme: "Contrarian Viewpoint",
          title: "Engagement & Community Debate",
          format: "twitter",
          hook: "Unpopular opinion: this common standard advice is actually holding you back.",
          brief: "Share an honest, contrarian viewpoint and invite your community to discuss."
        },
        {
          day: "Day 7 (Sunday)",
          theme: "Roadmap & Vision Ahead",
          title: "Inspirational Short Script",
          format: "script",
          hook: "Starting tomorrow, focus on these 2 key levers only.",
          brief: "A 40-second inspirational script focused on weekly goal clarity and execution."
        }
      ];
    }

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Calendar suggestions error:', error.message);
    res.status(500).json({ success: false, error: 'Unable to generate content schedule suggestions.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'local' });
});

app.listen(PORT, () => console.log(`VIRALY API running at http://localhost:${PORT}`));