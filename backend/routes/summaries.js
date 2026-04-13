// ============================================================
//  routes/summaries.js - Learning Summaries Routes
// ============================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../config/supabase');

// ── AI clients
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const deepseekClient = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' })
  : null;

const anthropicClient = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'dummy'
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
const upload = multer({
  dest: path.join(__dirname, '..', 'tmp'),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4', '.mpeg', '.mpga'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Unsupported audio format. Use MP3, WAV, M4A, or OGG.'));
  }
});

// ── Middleware: Check JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

function buildSummaryFromText(text, style = 'simple', occupation = 'general') {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return cleaned;

  // Split into logical groups (intro, body, conclusion)
  const total = sentences.length;
  const introEnd = Math.max(1, Math.ceil(total * 0.2));
  const bodyEnd = Math.max(introEnd + 1, Math.ceil(total * 0.75));

  const intro = sentences.slice(0, introEnd);
  const body = sentences.slice(introEnd, bodyEnd);
  const conclusion = sentences.slice(bodyEnd);

  const parts = [];

  if (style === 'bullets') {
    parts.push('## Overview');
    intro.forEach(s => parts.push(`- ${s}`));
    if (body.length) {
      parts.push('');
      parts.push('## Key Points');
      body.forEach(s => parts.push(`- ${s}`));
    }
    if (conclusion.length) {
      parts.push('');
      parts.push('## Conclusion');
      conclusion.forEach(s => parts.push(`- ${s}`));
    }
  } else if (style === 'detailed') {
    parts.push('## Overview');
    parts.push(intro.join(' '));
    if (body.length) {
      parts.push('');
      parts.push('## Detailed Analysis');
      // Group body sentences into paragraphs of 3
      for (let i = 0; i < body.length; i += 3) {
        parts.push(body.slice(i, i + 3).join(' '));
      }
    }
    if (conclusion.length) {
      parts.push('');
      parts.push('## Summary & Takeaways');
      parts.push(conclusion.join(' '));
    }
  } else {
    // simple
    parts.push('## Overview');
    parts.push(intro.join(' '));
    if (body.length) {
      parts.push('');
      parts.push('## Main Points');
      body.forEach(s => parts.push(`- ${s}`));
    }
    if (conclusion.length) {
      parts.push('');
      parts.push('## Conclusion');
      parts.push(conclusion.join(' '));
    }
  }

  return parts.join('\n');
}

// ── AI Summarization using selected model
async function aiSummarize(text, style, occupation, language, model) {
  const styleGuide = {
    simple: 'Write a clear, concise summary with sections: Overview, Main Points (as bullet list), Conclusion.',
    detailed: 'Write a thorough detailed summary with sections: Overview, Detailed Analysis (multiple paragraphs), Summary & Takeaways.',
    bullets: 'Write the entire summary as organized bullet points with sections: Overview, Key Points, Conclusion.'
  };

  const prompt = `You are an expert summarizer for ${occupation || 'general'} audience.
Summarize the following text in ${language || 'English'}.
${styleGuide[style] || styleGuide.simple}
Use markdown formatting with ## headings.
Mark important terms with **bold**.
Add a > blockquote callout for the most critical takeaway.
At the end, add:
---JSON---
{"highlights":[{"icon":"📌","val":"<key point>","label":"Highlight"},{"icon":"📊","val":"<main fact>","label":"Fact"},{"icon":"⚡","val":"<action item>","label":"Next Step"}],"takeaways":["<takeaway 1>","<takeaway 2>","<takeaway 3>"]}
---END---

Text to summarize:
${text.slice(0, 60000)}`;

  // Try selected model, fall back to others if unavailable
  const modelOrder = model === 'gpt'
    ? ['gpt', 'deepseek', 'claude']
    : model === 'deepseek'
      ? ['deepseek', 'gpt', 'claude']
      : ['claude', 'deepseek', 'gpt'];

  for (const m of modelOrder) {
    try {
      if (m === 'claude' && anthropicClient) {
        const resp = await anthropicClient.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        });
        return resp.content[0].text;
      }
      if (m === 'gpt' && openaiClient) {
        const resp = await openaiClient.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        });
        return resp.choices[0].message.content;
      }
      if (m === 'deepseek' && deepseekClient) {
        const resp = await deepseekClient.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        });
        return resp.choices[0].message.content;
      }
    } catch (err) {
      console.warn(`[AI SUMMARIZE] ${m} failed:`, err.message);
      continue;
    }
  }

  // All models failed — fall back to local text splitter
  console.warn('[AI SUMMARIZE] All models failed, using local fallback');
  return null;
}

// ── GET /api/summaries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: summaries, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, summaries: summaries || [] });

  } catch (error) {
    console.error('[GET SUMMARIES ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/summaries/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: summary, error } = await supabase
      .from('summaries')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    res.json({ success: true, summary });

  } catch (error) {
    console.error('[GET SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/summaries
router.post('/', authenticateToken, async (req, res) => {
  try {
    // ── Enforce free plan limit (3 summaries per month)
    const userPlan = req.user.plan || 'free';
    if (userPlan === 'free') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error: countErr } = await supabase
        .from('summaries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (!countErr && count >= 3) {
        return res.status(403).json({ error: 'Free plan limit reached (3 summaries/month). Upgrade to Pro for unlimited access.', upgradeRequired: true });
      }
    }

    const { title, text, language, occupation, style, model } = req.body;

    const fileName = title || `Summary ${new Date().toLocaleString()}`;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // Try AI summarization first, fall back to local text splitter
    let summaryText = await aiSummarize(text, style, occupation, language, model || 'claude');
    if (!summaryText) {
      summaryText = buildSummaryFromText(text, style, occupation);
    }

    if (!summaryText) {
      return res.status(400).json({ error: 'Could not generate summary' });
    }

    const wordCount = summaryText.trim().split(/\s+/).length;

    const { data: summary, error } = await supabase
      .from('summaries')
      .insert([{
        user_id: req.user.id,
        file_name: fileName,
        file_type: 'text',
        file_size_kb: Math.round(new Blob([text || '']).size / 1024) || 0,
        language: language || 'english-simple',
        occupation: occupation || 'general',
        style: style || 'simple',
        word_count: wordCount,
        summary_text: summaryText,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, summary });

  } catch (error) {
    console.error('[CREATE SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/summaries/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { file_name, summary_text } = req.body;

    // Verify ownership
    const { data: existing } = await supabase
      .from('summaries')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = {};
    if (file_name) updates.file_name = file_name;
    if (summary_text) updates.summary_text = summary_text;

    const { data: summary, error } = await supabase
      .from('summaries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, summary });

  } catch (error) {
    console.error('[UPDATE SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/summaries/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await supabase
      .from('summaries')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Summary deleted' });

  } catch (error) {
    console.error('[DELETE SUMMARY ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/summaries/transcribe (Audio → Text via Whisper)
router.post('/transcribe', authenticateToken, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const filePath = req.file.path;

  try {
    if (!openaiClient) {
      return res.status(503).json({ error: 'Audio transcription is not configured. Set OPENAI_API_KEY in environment.' });
    }

    // Rename temp file to include original extension (Whisper needs it)
    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp3';
    const namedPath = filePath + ext;
    fs.renameSync(filePath, namedPath);

    const transcription = await openaiClient.audio.transcriptions.create({
      file: fs.createReadStream(namedPath),
      model: 'whisper-1',
      response_format: 'text',
    });

    // Clean up temp file
    fs.unlink(namedPath, () => {});

    const text = typeof transcription === 'string' ? transcription : transcription.text || '';
    if (!text.trim()) {
      return res.status(422).json({ error: 'Could not transcribe audio. The file may be empty or inaudible.' });
    }

    res.json({ success: true, text });

  } catch (error) {
    // Clean up temp file on error
    try { fs.unlinkSync(filePath); } catch {}
    try { fs.unlinkSync(filePath + path.extname(req.file.originalname)); } catch {}

    console.error('[TRANSCRIBE ERROR]', error);

    if (error.status === 401) {
      return res.status(503).json({ error: 'Audio/video transcription requires a valid OpenAI API key (Whisper). This is separate from the AI model selection. Please set a valid OPENAI_API_KEY or use a PDF/text file instead.' });
    }
    res.status(500).json({ error: 'Transcription failed: ' + (error.message || 'Unknown error') });
  }
});

module.exports = router;
