const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`OpenAI proxy server running on port ${PORT}`);
});

// --- GENERA REPORT ---
app.post('/api/generate-report', async (req, res) => {
  const { url } = req.body;
  const openaiKey = process.env.OPENAI_API_KEY;

  const prompt = `
You are a professional CRO, UX, copywriting, and technical web consultant. Analyze the landing page: ${url}

At the VERY TOP, output ONLY the overall score as:
<strong class="score-number">[score] / 10</strong>

Then, output EXACTLY 4 sections, each with this structure (do NOT change the HTML, do NOT change the section names):

<div class="report-section">
  <div class="section-header">
    <h4>[Category Name]</h4>
  </div>
  <ul>
    <li>
      <strong>[Element Name]</strong>
      <div class="explanation">
        <strong>Problem:</strong> [Briefly describe the main issue in a professional, concise way.]
        <br>
        <strong>Solution:</strong> [Summarize the best solution in a clear, actionable way.]
        <br>
        <strong>Actions:</strong>
        <ul>
          <li>[Action step 1]</li>
          <li>[Action step 2]</li>
          <li>[Action step 3]</li>
        </ul>
        <br>
        <strong>Estimated implementation time:</strong> [Realistic estimate in minutes or hours, e.g. "20 minutes", "1 hour"]
      </div>
    </li>
    ...repeat for all 2 elements...
  </ul>
</div>

At the END of the report, after all sections, output this line:
<strong>Total estimated implementation time for all suggestions:</strong> [sum of all times, e.g. "2 hours 30 minutes"]

STRICT RULES:
- Output ONLY the HTML as described, nothing else.
- The FIRST section MUST be named exactly "General Overview" (with <h4>General Overview</h4>).
- If you do not find a major problem for an element, write: "<strong>Problem:</strong> No major issue found. Minor suggestion: [minor suggestion]."
- DO NOT change the HTML structure, DO NOT change the section or element names, DO NOT add or remove sections.
- DO NOT leave any Problem, Solution, Actions, or Estimated implementation time blank. Always write at least 1-2 sentences for Problem and Solution, 3 concrete action steps for Actions, and a realistic time estimate for each suggestion.
- The total output must be professional, concise, and NOT exceed 3500 characters.

Categories and elements to analyze:

1. General Overview
   - Value Proposition Clarity
   - First Impression

2. Copywriting & Persuasion
   - Headline
   - Call to Action (CTA)

3. Design & User Experience
   - Visual Hierarchy
   - Mobile Responsiveness

4. Technical & Mobile Optimization
   - Page Speed
   - SEO Basics
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    console.log("OPENAI RAW RESPONSE:\n", data.choices?.[0]?.message?.content);
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// --- INVIO REPORT VIA EMAIL ---
app.post('/api/send-report', async (req, res) => {
  const { url, html, email, name, company } = req.body;

  try {
    // Estrai lo score dal report HTML
    let score = '-';
    const scoreMatch = html.match(/<strong class="score-number">([\d.]+)\s*\/\s*10<\/strong>/i);
    if (scoreMatch) score = scoreMatch[1];

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const now = new Date().toLocaleString();

const htmlMail = `
<div style="max-width:600px;margin:0 auto;background:#f8fbfd;border-radius:14px;padding:32px 0 24px 0;font-family:Arial,sans-serif;border:1px solid #e3eaf3;">
  <div style="text-align:center;margin-bottom:24px;">
    <img src="https://landingfixai.com/images/logo-header.png" alt="LandingFix AI" style="max-width:180px;margin-bottom:12px;">
    <h2 style="color:#0077cc;font-size:1.5em;margin:0 0 8px 0;font-weight:800;letter-spacing:-1px;">Your Landing Page Report is Ready!</h2>
    <p style="color:#333;font-size:1.08em;margin:0 0 18px 0;">Hi ${name || ''},<br>
    your personalized landing page analysis is ready.<br>
    See below for your detailed AI-powered report.</p>
  </div>
  <div style="background:#fff;border-radius:10px;padding:18px 18px 10px 18px;margin-bottom:18px;box-shadow:0 2px 8px rgba(0,119,204,0.06);">
    <table style="width:100%;font-size:1em;color:#222;margin-bottom:18px;">
      <tr><td style="padding:6px 0;font-weight:600;width:120px;">Name:</td><td style="padding:6px 0;">${name || '-'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">Company:</td><td style="padding:6px 0;">${company || '-'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">Email:</td><td style="padding:6px 0;">${email}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">URL:</td><td style="padding:6px 0;"><a href="${url}" style="color:#0077cc;text-decoration:underline;">${url}</a></td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">Date:</td><td style="padding:6px 0;">${now}</td></tr>
      <tr><td style="padding:6px 0;font-weight:600;">Score:</td><td style="padding:6px 0;">${score} / 10</td></tr>
    </table>
    ${html}
  </div>
  <div style="text-align:center;margin:32px 0 18px 0;">
    <a href="https://www.producthunt.com/products/landingfix-ai-1-0/reviews/new" target="_blank" style="display:inline-block;background:#ff6154;color:#fff;font-weight:700;font-size:1.08em;padding:14px 32px;border-radius:8px;text-decoration:none;box-shadow:0 2px 8px rgba(255,97,84,0.13);transition:background 0.2s;">
      ❤️ Love LandingFix AI? Leave us a review on Product Hunt!
    </a>
  </div>
  <div style="text-align:center;color:#888;font-size:0.98em;margin-top:18px;">
    <p style="margin-bottom:10px;">Need help improving your landing page?<br>
    <a href="mailto:support@landingfixai.com" style="color:#0077cc;text-decoration:underline;">Contact LandingFix AI</a></p>
    <p style="margin-top:18px;font-size:0.93em;color:#aaa;">
      This report was generated automatically by LandingFix AI based on the information provided and AI analysis. It is intended for informational purposes only and does not constitute professional advice.<br>
      &copy; 2025 LandingFix AI. All rights reserved.
    </p>
  </div>
</div>
`;

    await transporter.sendMail({
      from: `"LandingFix AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your LandingFix AI Report is Ready!",
      html: htmlMail
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: 'Email send failed' });
  }
});