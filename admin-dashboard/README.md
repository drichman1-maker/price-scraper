# Scraper Admin Dashboard

Web-based admin dashboard for managing price scrapers, viewing logs, and sending price drop alerts.

## Features

### 📋 Products Tab
- View all products with current prices
- Price history mini-chart
- Manual price override (when scraper fails)
- **Send Alert** button to notify subscribers
- Expand to see all retailer prices
- Filter by category, search by name

### 🔔 Alerts Tab
- View alert subscriber statistics
- See how many people are waiting for each product
- **Quick Send Alert** buttons
- Track alerts sent

### 📝 Scraper Logs
- View recent scraper runs
- See success/error status
- Check duration and output

### ⚙️ Settings
- Change scrape frequency
- Enable/disable retailers
- Configure proxy service

## Running Locally

```bash
cd admin-dashboard
npm install

# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Production server
npm start
```

## Deploying to Fly.io

```bash
cd admin-dashboard

# Install dependencies
npm install
npm run build

# Create fly.toml
cat > fly.toml << 'EOF'
app = "scraper-admin-dashboard"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  NODE_ENV = "production"
  ADMIN_API_KEY = "your-secret-key"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
EOF

# Deploy
fly launch --no-deploy
fly deploy
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ADMIN_API_KEY` | API key for write operations |
| `THERESMAC_API_URL` | TheresMac backend URL |
| `GPUDRIP_API_URL` | GPU Drip backend URL |
| `PORT` | Server port (default: 3001) |

## API Endpoints

### GET /api/products
List all products

### POST /api/products/:id/price
Manual price update (requires API key)

```json
{
  "price": 999,
  "retailer": "amazon",
  "note": "Manual override - sale price"
}
```

### POST /api/send-alert
Send price drop alert (requires API key)

```json
{
  "productId": "macbook-air-13-m3",
  "message": "🚨 Price drop! MacBook Air 13\" now $999"
}
```

### POST /api/scraper/run
Trigger manual scrape (requires API key)

```json
{
  "project": "theresmac"
}
```

## Screenshots

- Products grid with price history
- Send Alert modal with subscriber count
- Scraper logs with status
- Settings panel

## Next Steps

1. Connect to real backend APIs (TheresMac + GPU Drip)
2. Add authentication (login page)
3. Add real-time updates (WebSocket)
4. Add more detailed price history charts
5. Add export functionality