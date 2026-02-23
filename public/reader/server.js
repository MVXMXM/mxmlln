require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log(`Created screenshots folder at ${SCREENSHOTS_DIR}`);
}

function getScreenshotHash(url) {
  return crypto.createHash('md5').update(String(url)).digest('hex');
}

const app = express();
const PORT = 3002; // Different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from this directory
app.use('/screenshots', express.static(SCREENSHOTS_DIR)); // Direct image URLs for textures

// Explicit screenshot route so images get correct Content-Type and CORS
app.get(/^\/screenshots\/([a-f0-9]{32})\.jpg$/, (req, res) => {
  const hash = req.params[0];
  const filePath = path.join(SCREENSHOTS_DIR, hash + '.jpg');
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.type('jpeg');
  res.sendFile(filePath);
});

// Reading List Data
const DATA_FILE = path.join(__dirname, 'reading-list.json');

// Helper function to read data
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { links: [] };
  }
}

// Helper function to write data
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

// API Routes
app.get('/api/reading-list', (req, res) => {
  try {
    const data = readData();
    const links = (data.links || []).map(link => ({
      ...link,
      screenshotHash: getScreenshotHash(link.url),
    }));
    res.json({ ...data, links });
  } catch (error) {
    console.error('Error fetching reading list:', error);
    res.status(500).json({ error: 'Failed to load reading list' });
  }
});

app.post('/api/reading-list', (req, res) => {
  try {
    const { url, title } = req.body;
    if (!url || !title) {
      return res.status(400).json({ error: 'URL and title are required' });
    }

    const data = readData();
    const newLink = {
      id: Date.now().toString(),
      url,
      title,
      createdAt: new Date().toISOString(),
      metadata: {},
      read: false,
      screenshotHash: getScreenshotHash(url),
    };

    data.links.push(newLink);

    if (writeData(data)) {
      captureScreenshot(url).catch(() => {}); // fire-and-forget when adding
      res.status(201).json(newLink);
    } else {
      res.status(500).json({ error: 'Failed to save link' });
    }
  } catch (error) {
    console.error('Error adding link:', error);
    res.status(500).json({ error: 'Failed to add link' });
  }
});

app.put('/api/reading-list/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { url, title, metadata, read } = req.body;
    
    const data = readData();
    const linkIndex = data.links.findIndex(link => link.id === id);
    
    if (linkIndex === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }

    if (url) data.links[linkIndex].url = url;
    if (title) data.links[linkIndex].title = title;
    if (metadata) data.links[linkIndex].metadata = { ...data.links[linkIndex].metadata, ...metadata };
    if (typeof read === 'boolean') data.links[linkIndex].read = read;

    if (writeData(data)) {
      res.json(data.links[linkIndex]);
    } else {
      res.status(500).json({ error: 'Failed to update link' });
    }
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Screenshot: only when adding an entry; stored in screenshots/ and served statically
function getScreenshotPath(url) {
  return path.join(SCREENSHOTS_DIR, `${getScreenshotHash(url)}.jpg`);
}

async function captureScreenshot(url) {
  const accessKey = process.env.SCREENSHOT_ONE_ACCESS_KEY;
  if (!accessKey) {
    console.warn('Screenshot skipped: SCREENSHOT_ONE_ACCESS_KEY not set');
    return;
  }
  const filePath = getScreenshotPath(url);
  if (fs.existsSync(filePath)) return;
  try {
    const params = new URLSearchParams({
      url,
      access_key: accessKey,
      viewport_width: 600,
      viewport_height: 400,
      device_scale_factor: 2,
      format: 'jpeg',
      block_ads: 'true',
      block_cookie_banners: 'true',
    });
    const res = await fetch(`https://api.screenshotone.com/take?${params}`);
    if (!res.ok) {
      console.error('Screenshot One error for', url, await res.text());
      return;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    console.log('Screenshot saved:', filePath);
  } catch (err) {
    console.error('Screenshot capture error:', err);
  }
}

// Capture screenshots for any entries missing one
app.post('/api/capture-missing', async (req, res) => {
  try {
    const data = readData();
    const missing = data.links.filter(link => !fs.existsSync(getScreenshotPath(link.url)));
    if (missing.length === 0) {
      return res.json({ message: 'All screenshots present', captured: 0 });
    }
    res.json({ message: `Capturing ${missing.length} screenshots in background`, urls: missing.map(l => l.url) });
    for (const link of missing) {
      await captureScreenshot(link.url);
    }
    console.log(`Finished capturing ${missing.length} missing screenshots`);
  } catch (error) {
    console.error('Error capturing missing screenshots:', error);
    res.status(500).json({ error: 'Failed to capture screenshots' });
  }
});

app.delete('/api/reading-list/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const data = readData();
    const linkIndex = data.links.findIndex(link => link.id === id);
    
    if (linkIndex === -1) {
      return res.status(404).json({ error: 'Link not found' });
    }

    data.links.splice(linkIndex, 1);

    if (writeData(data)) {
      res.status(204).send();
    } else {
      res.status(500).json({ error: 'Failed to delete link' });
    }
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Reading List Service running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/reading-list`);
});

module.exports = app;
