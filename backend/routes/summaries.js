// backend/routes/summaries.js — AI summarization endpoint
const router = require('express').Router();
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI   = require('openai');
const { requireUser, requirePlan } = require('../middleware/auth');
const db = require('../config/db');

const upload   = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const claude   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gpt      = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });

const LANG_MAP = {
  'english-simple': 'simple, clear English with short sentences',
  'hinglish': 'Hinglish — natural Hindi+English mix (e.g. "Revenue badh gayi", "Growth ho rahi hai")',
  'hindi': 'pure Hindi in Devanagari script',
  'spanish':'Spanish','french':'French','german':'German','arabic':'Arabic (العربية)',
  'japanese':'Japanese (日本語)','korean':'Korean (한국어)','chinese':'Simplified Chinese',
  'portuguese':'Brazilian Portuguese','italian':'Italian','russian':'Russian',
  'bengali':'Bengali (বাংলা)','urdu':'Urdu (اردو)','tamil':'Tamil (தமிழ்)',
  'telugu':'Telugu (తెలుగు)','marathi':'Marathi (मराठी)','dutch':'Dutch','swedish':'Swedish',
};

const OCC_FOCUS = {
  student:  'definitions, concepts, exam key points, formulas, examples',
  business: 'revenue, KPIs, growth rates, profit margins, action items, deadlines',
  medical:  'diagnoses, symptoms, treatments, medications, dosages, prognosis',
  legal:    'clauses, obligations, deadlines, parties, penalties, jurisdiction',
  tech:     'APIs, specs, architecture, requirements, frameworks, performance',
  research: 'methodology, sample size, findings, statistics, conclusions',
  teacher:  'learning objectives, key concepts, examples, assessments',
  general:  'main ideas, important facts, conclusions',
};

// POST /api/summaries — create summary
router.post('/', requireUser, upload.single('file'), async (req, res) => {
  try {
    const { language='english-simple', occupation='general', style='simple', text, model='gpt' } = req.body;

    // Check free quota
    if (req.user.plan === 'free') {
      const [[u]] = await db.execute('SELECT docs_this_month FROM users WHERE id=?', [req.user.sub]);
      if (u.docs_this_month >= 3) {
        return res.status(403).json({ error:'Free plan limit reached (3/month). Please upgrade.', upgradeRequired:true });
      }
    }

    let content = '';
    let fileName = 'pasted-text', fileType = 'text', fileSize = 0;

    if (req.file) {
      fileName = req.file.originalname;
      fileSize = Math.round(req.file.size / 1024);
      const ext = fileName.split('.').pop().toLowerCase();
      fileType = ['mp3','wav','m4a','ogg'].includes(ext) ? 'audio' : ['ppt','pptx'].includes(ext) ? 'ppt' : 'pdf';
      content  = `[File: ${fileName}]\n${req.file.buffer.toString('utf-8').substring(0,6000)}`;
    } else if (text) {
      content = text;
    } else {
      return res.status(400).json({ error:'Provide a file or text.' });
    }

    const styleInstr = {
      simple:   'Write a concise summary in 3-4 readable paragraphs.',
      detailed: 'Write a comprehensive summary in 6-8 paragraphs.',
      bullets:  'Write summary using ## headings and • bullet points.',
    };

    const prompt = `You are an expert summarizer for a ${occupation} professional. Summarize in ${LANG_MAP[language]||'simple English'}.

OCCUPATION FOCUS — highlight: ${OCC_FOCUS[occupation]||OCC_FOCUS.general}
${styleInstr[style]}

After summary add exactly:
---JSON---
{"highlights":[{"icon":"📊","val":"VALUE","label":"LABEL"},{"icon":"📅","val":"VALUE","label":"LABEL"},{"icon":"⚡","val":"VALUE","label":"LABEL"}],"takeaways":["point1","point2","point3"]}
---END---

${content.substring(0,7000)}`;

    // Stream response
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.setHeader('X-Accel-Buffering','no');

    let full = '';

    try {
      console.log('[Summarize] Using model:', model, '| API Key set:', !!process.env.OPENAI_API_KEY);
      if (model === 'gpt') {
        console.log('[GPT] Calling OpenAI API...');
        const stream = await gpt.chat.completions.create({ model:'gpt-4o-mini', max_tokens:1200, messages:[{role:'user',content:prompt}], stream:true });
        console.log('[GPT] Stream started');
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) { full += text; res.write(text); }
        }
        console.log('[GPT] Stream completed');
      } else if (model === 'deepseek') {
        console.log('[DeepSeek] Calling API...');
        const stream = await deepseek.chat.completions.create({ model:'deepseek-chat', max_tokens:1200, messages:[{role:'user',content:prompt}], stream:true });
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) { full += text; res.write(text); }
        }
        console.log('[DeepSeek] Stream completed');
      } else {
        // default: claude
        console.log('[Claude] Calling API...');
        const stream = claude.messages.stream({ model:'claude-sonnet-4-6', max_tokens:1200, messages:[{role:'user',content:prompt}] });
        for await (const chunk of stream) {
          if (chunk.type==='content_block_delta' && chunk.delta?.text) {
            full += chunk.delta.text; res.write(chunk.delta.text);
          }
        }
        console.log('[Claude] Stream completed');
      }
    } catch (aiError) {
      console.error('[AI API Error]', {
        status: aiError.status,
        message: aiError.message,
        code: aiError.code,
        type: aiError.type,
        error: aiError.error,
        full: aiError.toString()
      });
      // Fallback to GPT if Claude fails
      if (model !== 'gpt') {
        console.log('[Fallback] Model', model, 'failed, trying GPT...');
        try {
          const stream = await gpt.chat.completions.create({ model:'gpt-4o-mini', max_tokens:1200, messages:[{role:'user',content:prompt}], stream:true });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) { full += text; res.write(text); }
          }
          console.log('[GPT Fallback] Succeeded');
        } catch (gptError) {
          console.error('[GPT Fallback Error]', gptError.status, gptError.message);
          throw gptError;
        }
      } else {
        throw aiError;
      }
    }

    res.end();

    // Save to DB (async, non-blocking)
    const words = full.replace(/---JSON---[\s\S]*?---END---/,'').trim().split(/\s+/).length;
    db.execute(
      `INSERT INTO summaries (user_id,file_name,file_type,file_size_kb,language,occupation,style,word_count,summary_text) VALUES (?,?,?,?,?,?,?,?,?)`,
      [req.user.sub, fileName, fileType, fileSize, language, occupation, style, words, full.substring(0,60000)]
    ).then(() => {
      db.execute('UPDATE users SET docs_this_month=docs_this_month+1, total_docs=total_docs+1 WHERE id=?', [req.user.sub]);
    }).catch(console.error);

  } catch (e) {
    console.error('[Summarize] Outer catch', {
      message: e.message,
      status: e.status,
      code: e.code,
      stack: e.stack
    });
    if (!res.headersSent) {
      if (e.status === 401) {
        return res.status(401).json({ error:'API key invalid or expired.' });
      } else if (e.status === 429) {
        return res.status(429).json({ error:'Rate limit exceeded. Try again in 1 minute.' });
      } else if (e.code === 'ERR_MODULE_NOT_FOUND') {
        return res.status(500).json({ error:'Missing AI SDK. Check server config.' });
      } else {
        return res.status(500).json({ error:'Summarization failed: ' + (e.message || 'Unknown error') });
      }
    }
  }
});

// GET /api/summaries — list (admin or own)
router.get('/', requireUser, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id,file_name,language,occupation,style,word_count,created_at FROM summaries WHERE user_id=? ORDER BY created_at DESC LIMIT 50',
      [req.user.sub]
    );
    res.json({ summaries: rows });
  } catch { res.status(500).json({ error:'Fetch failed.' }); }
});

module.exports = router;
