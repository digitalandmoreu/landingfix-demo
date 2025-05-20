const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import fetch compatibile con tutte le versioni di Node
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/subscribe', async (req, res) => {
  const { name, email, company, url, goals } = req.body;
  const apiKey = process.env.BREVO_API_KEY;

  const data = {
    email,
    attributes: {
      FIRSTNAME: name,
      COMPANY: company,
      LANDING_URL: url,
      GOALS: Array.isArray(goals) ? goals.join(', ') : (goals || '')
    },
    listIds: [38], // Sostituisci con il tuo ID lista
    updateEnabled: true
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ROUTE PER OPENAI ---
app.post('/api/generate-report', async (req, res) => {
  const { prompt } = req.body;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// Porta dinamica per Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend in ascolto su http://localhost:${PORT}`);
});