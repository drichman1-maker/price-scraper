const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'alerts@theresmac.com';

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

// Backend API config
const THERESMAC_API_URL = process.env.THERESMAC_API_URL || 'https://theresmac-backend.fly.dev';
const THERESMAC_API_KEY = process.env.THERESMAC_API_KEY;

// Helper function to call backend API
async function fetchFromBackend(endpoint, options = {}) {
  const url = `${THERESMAC_API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(THERESMAC_API_KEY && { 'Authorization': `Bearer ${THERESMAC_API_KEY}` }),
    ...options.headers
  };
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(`Backend API error: ${response.status}`);
  return response.json();
}

// Send price drop alert to subscribers
app.post('/api/send-alert', requireApiKey, async (req, res) => {
  const { productId, productName, currentPrice, previousPrice, productUrl } = req.body;
  
  console.log(`[ADMIN] Sending price alert for ${productId}`);
  
  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'RESEND_API_KEY not configured' 
    });
  }
  
  try {
    // Fetch subscribers from backend
    const alertsData = await fetchFromBackend(`/api/products/${productId}/alerts`);
    const subscribers = alertsData?.alerts || [];
    
    if (subscribers.length === 0) {
      return res.json({
        success: true,
        message: 'No subscribers to notify',
        productId,
        sentCount: 0
      });
    }
    
    // Send email to each subscriber
    const results = [];
    const savings = previousPrice ? previousPrice - currentPrice : 0;
    const savingsPercent = previousPrice ? Math.round((savings / previousPrice) * 100) : 0;
    
    for (const subscriber of subscribers) {
      try {
        const { data, error } = await resend.emails.send({
          from: `TheresMac Price Alerts <${FROM_EMAIL}>`,
          to: [subscriber.email],
          subject: `🔥 Price Drop: ${productName} - $${currentPrice.toLocaleString()}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Price Alert</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a0a0a;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #141414; border-radius: 16px; border: 1px solid #262626;">
                      <tr>
                        <td style="padding: 32px; text-align: center; border-bottom: 1px solid #262626;">
                          <h1 style="margin: 0; color: #fafafa; font-size: 24px;">🔔 Price Drop Alert!</h1>
                          <p style="margin: 8px 0 0 0; color: #a3a3a3;">Good news! A product you're watching just dropped in price.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px;">
                          <h2 style="margin: 0 0 16px 0; color: #fafafa; font-size: 20px;">${productName}</h2>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding: 16px; background-color: #0a0a0a; border-radius: 12px; border: 1px solid #262626;">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <span style="color: #737373; font-size: 14px;">New Price</span>
                                      <div style="color: #22c55e; font-size: 32px; font-weight: bold;">$${currentPrice.toLocaleString()}</div>
                                    </td>
                                  </tr>
                                  ${previousPrice ? `
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <span style="color: #737373; font-size: 14px;">Previous Price</span>
                                      <div style="color: #a3a3a3; font-size: 18px; text-decoration: line-through;">$${previousPrice.toLocaleString()}</div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <span style="color: #737373; font-size: 14px;">You Save</span>
                                      <div style="color: #22c55e; font-size: 20px; font-weight: bold;">$${savings.toLocaleString()} (${savingsPercent}%)</div>
                                    </td>
                                  </tr>
                                  ` : ''}
                                </table>
                              </td>
                            </tr>
                          </table>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                            <tr>
                              <td align="center">
                                <a href="${productUrl || `https://theresmac.com/products/${productId}`}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                                  View Deal
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #262626;">
                          <p style="margin: 0; color: #525252; font-size: 12px;">
                            You're receiving this because you set a price alert on <a href="https://theresmac.com" style="color: #737373;">TheresMac.com</a>
                          </p>
                          <p style="margin: 12px 0 0 0; color: #525252; font-size: 12px;">
                            <a href="https://theresmac.com/alerts/manage?email=${encodeURIComponent(subscriber.email)}" style="color: #737373; text-decoration: underline;">Manage Alerts</a> | 
                            <a href="https://theresmac.com/alerts/unsubscribe?email=${encodeURIComponent(subscriber.email)}" style="color: #737373; text-decoration: underline;">Unsubscribe</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `
        });
        
        if (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          results.push({ email: subscriber.email, success: false, error: error.message });
        } else {
          results.push({ email: subscriber.email, success: true, messageId: data?.id });
        }
      } catch (err) {
        console.error(`Error sending to ${subscriber.email}:`, err);
        results.push({ email: subscriber.email, success: false, error: err.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Sent ${successCount}/${subscribers.length} alerts`,
      productId,
      sentCount: successCount,
      totalSubscribers: subscribers.length,
      results,
      sentAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error sending alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      productId
    });
  }
});

// Get alert subscribers for a product
app.get('/api/products/:id/subscribers', async (req, res) => {
  try {
    const alertsData = await fetchFromBackend(`/api/products/${req.params.id}/alerts`);
    
    res.json({
      productId: req.params.id,
      count: alertsData?.alerts?.length || 0,
      subscribers: alertsData?.alerts || []
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({
      productId: req.params.id,
      count: 0,
      subscribers: [],
      error: error.message
    });
  }
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