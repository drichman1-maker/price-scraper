const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// API Key authentication middleware
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const validKey = process.env.ADMIN_API_KEY || 'admin-secret-key-change';
  
  if (!apiKey || apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// ===== PRODUCTS API =====

// Get all products
app.get('/api/products', (req, res) => {
  // In production, fetch from your backends
  const products = [
    { id: 'macbook-air-13-m3', name: 'MacBook Air 13" M3', currentPrice: 1049, category: 'mac' },
    { id: 'macbook-air-15-m3', name: 'MacBook Air 15" M3', currentPrice: 1249, category: 'mac' },
    { id: 'macbook-pro-14-m4', name: 'MacBook Pro 14" M4', currentPrice: 1599, category: 'mac' },
  ];
  res.json(products);
});

// Update product price (manual override)
app.post('/api/products/:id/price', requireApiKey, (req, res) => {
  const { id } = req.params;
  const { price, retailer, note } = req.body;
  
  console.log(`[ADMIN] Manual price update: ${id} @ ${retailer} = $${price}`);
  
  res.json({
    success: true,
    productId: id,
    price,
    retailer,
    timestamp: new Date().toISOString(),
    note
  });
});

// ===== ALERTS API =====

// Send price drop alert to subscribers
app.post('/api/send-alert', requireApiKey, async (req, res) => {
  const { productId, message } = req.body;
  
  console.log(`[ADMIN] Sending price alert for ${productId}`);
  console.log(`Message: ${message}`);
  
  // In production, integrate with your email service (Resend, SendGrid, etc.)
  // await sendPriceAlert(productId, message);
  
  res.json({
    success: true,
    message: 'Alert sent successfully',
    productId,
    sentAt: new Date().toISOString()
  });
});

// Get alert subscribers for a product
app.get('/api/products/:id/subscribers', (req, res) => {
  // In production, fetch from database
  const subscribers = [
    { email: 'user1@example.com', targetPrice: 999, createdAt: '2024-03-20' },
    { email: 'user2@example.com', targetPrice: 1000, createdAt: '2024-03-21' },
  ];
  
  res.json({
    productId: req.params.id,
    count: subscribers.length,
    subscribers
  });
});

// ===== SCRAPER API =====

// Get scraper logs
app.get('/api/scraper/logs', (req, res) => {
  const logs = [
    { id: 1, timestamp: new Date().toISOString(), status: 'success', message: 'Scraped 24 products', duration: '45s' },
  ];
  res.json(logs);
});

// Trigger manual scrape
app.post('/api/scraper/run', requireApiKey, (req, res) => {
  const { project } = req.body;
  
  console.log(`[ADMIN] Manual scrape triggered for ${project}`);
  
  // Run the scraper
  const scraperPath = path.join(__dirname, '..', 'run_scraper.py');
  exec(`cd ${path.dirname(scraperPath)} && python3 run_scraper.py --project ${project}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Scraper error: ${error}`);
        return res.status(500).json({ error: 'Scraper failed' });
      }
      res.json({ success: true, output: stdout });
    }
  );
});

// ===== SETTINGS API =====

// Get scraper settings
app.get('/api/settings', (req, res) => {
  res.json({
    frequency: 'every-4-hours',
    retailers: ['amazon', 'ebay'],
    proxy: 'none',
    lastRun: '2024-03-26T08:00:00Z',
    nextRun: '2024-03-26T12:00:00Z'
  });
});

// Update scraper settings
app.post('/api/settings', requireApiKey, (req, res) => {
  const { frequency, retailers, proxy } = req.body;
  console.log('[ADMIN] Settings updated:', { frequency, retailers, proxy });
  res.json({ success: true, settings: { frequency, retailers, proxy } });
});

// ===== SERVE FRONTEND =====

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Admin Dashboard running on port ${PORT}`);
  console.log(`📊 Open http://localhost:${PORT} to access dashboard`);
});

module.exports = app;