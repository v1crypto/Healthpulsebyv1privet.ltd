const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "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";
const DEEPSEEK_MODEL = "deepseek-v4-flash";

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests' }
});
app.use('/api/chat', limiter);
app.use('/api/mcq', limiter);

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, systemPrompt, temperature, maxTokens } = req.body;
    const payload = {
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt || "You are Veda, a helpful medical AI tutor." },
        ...messages
      ],
      temperature: temperature || 0.3,
      max_tokens: maxTokens || 1400,
      stream: false
    };
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 60000
      }
    );
    const reply = response.data?.choices?.[0]?.message?.content || '';
    res.json({ success: true, reply });
  } catch (error) {
    console.error('❌ Chat Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mcq', async (req, res) => {
  try {
    const { prompt } = req.body;
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: "You are an expert medical MCQ writer. Output strict JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 90000
      }
    );
    const reply = response.data?.choices?.[0]?.message?.content || '';
    res.json({ success: true, reply });
  } catch (error) {
    console.error('❌ MCQ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
