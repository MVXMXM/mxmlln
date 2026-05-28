const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const { sql } = require('@vercel/postgres')
const { generateMeta, folioKnowledge } = require('../controllers/openaiController')
//const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
app.use(cors());
app.use(express.json())
app.use(express.static('public'));
//app.listen(8080, () => console.log('listening for requests on port 8080'))

app.post('/api/openai/meta', generateMeta)
app.post('/api/openai/folio', folioKnowledge)

// Read-only reading list endpoint for the spiral view (works on Vercel).
// Mirrors the shape returned by public/reader/server.js for spiral.html.
// require() at module load so the Vercel bundler statically includes the JSON.
let READING_LIST_DATA = { links: [] };
try {
  READING_LIST_DATA = require('../public/reader/reading-list.json');
} catch (err) {
  console.error('Could not load reading-list.json at startup:', err);
}
app.get('/api/reading-list', (req, res) => {
  try {
    const links = (READING_LIST_DATA.links || []).map(link => ({
      ...link,
      screenshotHash: crypto.createHash('md5').update(link.url).digest('hex'),
    }));
    res.json({ ...READING_LIST_DATA, links });
  } catch (err) {
    console.error('Error serving reading list:', err);
    res.status(500).json({ error: 'Failed to load reading list' });
  }
});

// Serve HTML file
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

app.post('/api/submit', async (req, res) => {
  if (req.method === 'POST') {
    const { input } = req.body;

    try {
      await sql`INSERT INTO user_inputs (input_value) VALUES (${input})`;
      res.status(200).send('Input saved');
    } catch (err) {
      console.error(err);
      res.status(500).send('Error saving input');
    }
  } else {
    res.status(405).send('Method Not Allowed');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;

//app.use(express.json())
//app.use(express.static('public'))  // Make sure your HTML file is in the 'public' directory