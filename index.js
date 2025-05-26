const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// Route di test
app.get('/api/test', (req, res) => {
  res.json({ status: "ok" });
});

// --- ROUTE PER BREVO ---
app.post('/api/subscribe', async (req, res) => {
  const { name, email, company, url, goals } = req.body;
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'BREVO_API_KEY mancante' });
  }

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
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ROUTE PER PAYPAL CLIENT ID ---
app.get('/api/paypal-client-id', (req, res) => {
  res.json({ clientId: process.env.PAYPAL_CLIENT_ID });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend in ascolto su http://localhost:${PORT}`);
});