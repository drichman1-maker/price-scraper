# Scraper Deployment Guide

## Overview
Automated price scraping for TheresMac & GPU Drip using GitHub Actions + Playwright.

## Deployment Steps

### Step 1: Generate API Key

```bash
cd ~/.openclaw/workspace/scrapers
python setup_github_secrets.py --generate-key --save-script
```

This creates:
- A secure API key
- `setup_secrets.sh` script for GitHub configuration

### Step 2: Deploy Backend Updates

Both backends need the new scraper endpoints:

**TheresMac:**
```bash
cd ~/.openclaw/workspace/mactrackr-backend-fresh
fly secrets set SCRAPER_API_KEY="your-key-from-step-1"
git add -A && git commit -m "Add scraper webhook endpoints"
fly deploy
```

**GPU Drip:**
```bash
cd ~/.openclaw/workspace/gpudrip-backend
fly secrets set SCRAPER_API_KEY="your-key-from-step-1"
git add -A && git commit -m "Add scraper webhook endpoints"
fly deploy
```

### Step 3: Create GitHub Repository

```bash
cd ~/.openclaw/workspace/scrapers
git init
git add .
git commit -m "Initial scraper setup"

# Create public repo (free GitHub Actions)
gh repo create price-scraper --public --source=. --push
```

### Step 4: Configure GitHub Secrets

Run the generated script:
```bash
cd ~/.openclaw/workspace/scrapers
./setup_secrets.sh
```

Or manually add secrets at:
`https://github.com/YOUR_USERNAME/price-scraper/settings/secrets/actions`

Required secrets:
- `THERESMAC_API_URL`
- `GPUDRIP_API_URL`
- `THERESMAC_API_KEY`
- `GPUDRIP_API_KEY`
- `AMAZON_AFFILIATE_ID`
- `EBAY_AFFILIATE_ID`
- `SCRAPER_API_KEY`
- `THERESMAC_PRODUCTS_JSON`
- `GPUDRIP_PRODUCTS_JSON`

### Step 5: Create Product Mappings

Create `theresmac-products.json`:
```json
{
  "macbook-air-15-m3-2024": [
    {"retailer": "amazon", "url": "https://www.amazon.com/dp/B0CX23V2ZK"}
  ],
  "macbook-pro-14-m3-pro": [
    {"retailer": "amazon", "url": "https://www.amazon.com/dp/B0BSHF7WHW"},
    {"retailer": "ebay", "url": "https://www.ebay.com/itm/..."}
  ]
}
```

Create `gpudrip-products.json`:
```json
{
  "rtx-4090": [
    {"retailer": "amazon", "url": "https://www.amazon.com/dp/B0BGJQ4TZP"}
  ],
  "rtx-4080-super": [
    {"retailer": "amazon", "url": "https://www.amazon.com/dp/B0BCSJ99K9"}
  ]
}
```

Upload as GitHub secrets:
```bash
gh secret set THERESMAC_PRODUCTS_JSON --body "$(cat theresmac-products.json)"
gh secret set GPUDRIP_PRODUCTS_JSON --body "$(cat gpudrip-products.json)"
```

### Step 6: Test Locally (Optional)

```bash
# Set environment
export THERESMAC_API_URL="https://theresmac-backend.fly.dev"
export THERESMAC_API_KEY="your-key"
export THERESMAC_PRODUCTS_JSON='{"test-sku": [{"retailer": "amazon", "url": "..."}]}'

# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Test scraper
python test_scraper.py --scraper

# Test full run
python run_scraper.py --project theresmac
```

### Step 7: Trigger First Run

1. Go to GitHub repo → Actions → "Scrape Prices"
2. Click "Run workflow"
3. Select project, submit
4. Watch logs for results

### Step 8: Verify Results

Check your backends:
- TheresMac: `https://theresmac-backend.fly.dev/api/products`
- GPU Drip: `https://gpudrip-backend.fly.dev/api/gpus`

## Schedule

Scraper runs every 4 hours automatically (cron: `0 */4 * * *`)

To change:
Edit `.github/workflows/scrape-prices.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  - cron: '0 */12 * * *' # Every 12 hours
  - cron: '0 0 * * *'    # Daily
```

## Troubleshooting

### "Invalid API key" errors
→ Verify `SCRAPER_API_KEY` matches on both GitHub secrets and Fly.io backends

### "No products configured" errors
→ Check JSON format in `*_PRODUCTS_JSON` secrets (use JSON validator)

### CAPTCHA/Blocking
→ Enable proxy service (ScraperAPI $49/mo) or reduce frequency

### Failed scrapes
→ Check Actions logs for specific errors
→ Test URLs manually in browser
→ Verify product pages still exist

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| GitHub Actions | $0 | 2000 min/mo free (public repo) |
| Fly.io | $0 | Backends already running |
| ScraperAPI (optional) | $49/mo | Only if CAPTCHA issues |
| **Total** | **$0** | Without proxy service |

## Monitoring

- GitHub Actions logs: Real-time scraper output
- Artifacts: `results.json` saved for 7 days
- Backend logs: `fly logs -a theresmac-backend`
- Slack notifications: Add `SLACK_WEBHOOK_URL` secret for alerts

## Next Steps

After scraper is running:
1. Build admin dashboard for manual overrides
2. Add more retailers (Best Buy, Newegg)
3. Add price change alerts (email when price drops)
4. Historical price tracking visualization