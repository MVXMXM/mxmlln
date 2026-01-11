const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002; // Different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from this directory

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
    res.json(data);
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
      read: false
    };

    data.links.push(newLink);
    
    if (writeData(data)) {
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
