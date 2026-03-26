# Price Scraper for TheresMac & GPU Drip

Automated price scraping using GitHub Actions + Playwright. Scrapes Amazon and eBay every 4 hours and updates backend APIs.

## Architecture

```
GitHub Actions (cron) → Scraper Engine → Playwright → Amazon/eBay → Backend API
```

- **Free tier**: 2000 minutes/month (enough for 6x daily scrapes)
- **Anti-bot**: User-agent rotation, stealth mode, optional proxy service
- **Retries**: Automatic retry with exponential backoff

## Setup

### 1. Fork/Create Repository

Push this code to a GitHub repository.

### 2. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions**, add:

| Secret | Description | Example |
|--------|-------------|---------|
| `THERESMAC_API_URL` | TheresMac backend URL | `https://theresmac-backend.fly.dev` |
| `GPUDRIP_API_URL` | GPU Drip backend URL | `https://gpudrip-backend.fly.dev` |
| `THERESMAC_API_KEY` | API key for TheresMac | (from Fly.io secrets) |
| `GPUDRIP_API_KEY` | API key for GPU Drip | (from Fly.io secrets) |
| `AMAZON_AFFILIATE_ID` | Amazon affiliate tag | `Theresmac-20` |
| `EBAY_AFFILIATE_ID` | eBay affiliate ID | `5339142921` |
| `THERESMAC_PRODUCTS_JSON` | Product URL mappings (see below) | JSON string |
| `GPUDRIP_PRODUCTS_JSON` | Product URL mappings | JSON string |

**Optional:**
| `SCRAPER_API_KEY` | ScraperAPI key for proxy service |
| `SLACK_WEBHOOK_URL` | Slack notifications on failure |

### 3. Product Mapping Format

The `*_PRODUCTS_JSON` secrets should be valid JSON:

```json
{
  "macbook-air-15-m3-2024": [
    {"retailer": "amazon", "url": "https://www.amazon.com/dp/B0CX23V2ZK"},
    {"retailer": "ebay", "url": "https://www.ebay.com/itm/123456789"}
  ],
  "macbook-pro-16-m3-max": [
    {"retailer": "amazon", "url": "https://www.amazon.com/dp/B0BSHF7WHW"}
  ]
}
```

Key = product SKU (must match backend SKU exactly)
Value = array of {retailer, url} objects

### 4. Manual Run

To trigger manually:
- Go to **Actions → Scrape Prices**
- Click **Run workflow**
- Select project and options

## Backend API Requirements

Your backend must accept POST requests to:

```
POST /api/products/{sku}/prices
Content-Type: application/json
Authorization: Bearer {API_KEY}

{
  "retailer": "amazon",
  "price": 1199.00,
  "currency": "USD",
  "in_stock": true,
  "condition": "New",
  "url": "https://www.amazon.com/dp/...",
  "scraped_at": 1703980800
}
```

Expected responses:
- `200/201/204` = Success
- `401` = Invalid API key
- `404` = Product SKU not found

## Testing Locally

```bash
# Setup
pip install -r requirements.txt
playwright install chromium

# Set env vars
export THERESMAC_API_URL="https://your-backend.fly.dev"
export THERESMAC_API_KEY="your-key"
export THERESMAC_PRODUCTS_JSON='{"sku": [{"retailer": "amazon", "url": "..."}]}'

# Run scraper
python run_scraper.py --project theresmac

# With proxy
python run_scraper.py --project theresmac --proxy
```

## Anti-Bot Strategy

1. **Stealth Mode**: Playwright with automation detection bypass
2. **Rate Limiting**: 1 request every 2 seconds minimum
3. **User-Agent Rotation**: Per-retailer realistic headers
4. **Proxy Service** (optional): ScraperAPI handles CAPTCHAs

## Proxy Service Options

| Service | Price | Pros |
|---------|-------|------|
| ScraperAPI | $49/mo unlimited | Handles CAPTCHAs, easy integration |
| BrightData | $3/GB pay-as-you-go | Residential IPs, very reliable |
| Oxylabs | $15/GB | Good for starting, rotating proxies |

To enable: Add `SCRAPER_API_KEY` secret and check "Use proxy" in manual runs.

## Monitoring

- GitHub Actions shows run history
- Results uploaded as artifacts (7-day retention)
- Slack notification on failure (optional)
- Scraper logs in Actions output

## Troubleshooting

**"No products configured" error**
→ Check that `*_PRODUCTS_JSON` secret is valid JSON

**"CAPTCHA detected" errors**
→ Enable proxy service or reduce scrape frequency

**"Connection timeout" errors**
→ Check backend is running on Fly.io

**Prices not updating**
→ Verify API endpoint exists and accepts POST requests

## Schedule

Current cron: `0 */4 * * *` (every 4 hours)

Change in `.github/workflows/scrape-prices.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  - cron: '0 */12 * * *' # Every 12 hours
  - cron: '0 0 * * *'    # Once daily
```

## Admin Terminal (Future)

When you build the admin dashboard:
- Read/write product mappings
- Manual price overrides
- Scrape logs and history
- Add new products (with URL mapping)

The scraper will continue working with the same API format.