# Price & Stock Monitoring System

Unified monitoring solution for **TheresMac** and **GPU Drip** that tracks prices, stock status, and deal opportunities across multiple retailers.

## Features

✅ **Dual-Site Monitoring** - Fetches live data from both backends in one run
✅ **Deal Detection** - Alerts when prices drop ≥10% below MSRP
✅ **Premium Alerts** - Flags when prices exceed MSRP by ≥15%
✅ **Stock Tracking** - Monitors in/out of stock status
✅ **Rate Limiting** - Built-in retry logic with exponential backoff
✅ **HTML Dashboard** - Visual report with sortable data
✅ **JSON Export** - Machine-readable results for integrations
✅ **URL Validation** - Verifies affiliate links redirect correctly
✅ **Scheduled Runs** - Cron/launchd support for automation

## Quick Start

### Manual Scan

```bash
cd ~/.openclaw/workspace/scrapers

# Full scan (both sites)
./run_price_monitor.sh

# Alert-only mode (deals + premiums)
./run_price_monitor.sh --alert-only

# Single project
./run_price_monitor.sh --project theresmac
./run_price_monitor.sh --project gpudrip
```

### View Results

- **Dashboard**: Open `price_monitor_dashboard.html` in your browser
- **Raw Data**: `price_monitor_results.json` (522KB, 1,203 price points)
- **Logs**: Check console output or redirect to file

### URL Checker

Verify affiliate/product URLs redirect correctly:

```bash
# Check all URLs
python3 url_checker.py

# Check single project
python3 url_checker.py --project theresmac

# Check single retailer
python3 url_checker.py --retailer amazon
```

## Scheduling

### Daily 8 AM EST (Cron)

```bash
crontab -e
```

Add:
```cron
0 8 * * * cd /Users/douglasrichman/.openclaw/workspace/scrapers && ./run_price_monitor.sh >> /tmp/price_monitor.log 2>&1
```

### Hourly Deal Hunting

```cron
0 * * * * cd /Users/douglasrichman/.openclaw/workspace/scrapers && ./run_price_monitor.sh --alert-only >> /tmp/price_monitor.log 2>&1
```

### macOS launchd (Native)

See `SCHEDULING.md` for full setup.

## Current Stats (Last Scan: 2026-04-15 10:51 AM)

| Project | Products | Price Points | In Stock | Deals (≥10% off) | Premiums |
|---------|----------|--------------|----------|------------------|----------|
| TheresMac | 128 | 899 | 857 (95%) | 263 | 0 |
| GPU Drip | 38 | 304 | 264 (87%) | 128 | 16 |
| **Total** | **166** | **1,203** | **1,121 (93%)** | **391** | **16** |

## Top Deals (Sample)

| Product | Retailer | MSRP | Price | Discount | Stock |
|---------|----------|------|-------|----------|-------|
| Apple Watch SE 40mm (Refurb) | Back Market | $169 | $99 | **41.4%** | ✅ |
| iPhone 14 (Refurb) | Back Market | $529 | $319 | **39.7%** | ✅ |
| RX 6900 XT | Amazon | $999 | $649 | **35.0%** | ✅ |
| RTX 3090 | Amazon | $1,499 | $999 | **33.4%** | ✅ |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    price_monitor.py                         │
│  ┌─────────────┐              ┌─────────────┐               │
│  │ TheresMac   │              │  GPU Drip   │               │
│  │ Backend API │              │ Backend API │               │
│  └──────┬──────┘              └──────┬──────┘               │
│         │                            │                       │
│         └────────────┬───────────────┘                       │
│                      ▼                                       │
│              Parse & Compare                                 │
│         (Price vs MSRP, Stock)                              │
│                      │                                       │
│        ┌─────────────┼─────────────┐                       │
│        ▼             ▼             ▼                       │
│   JSON File    HTML Dashboard  Console Alerts               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     url_checker.py                          │
│  Fetches URLs from backends → Checks redirects → Reports    │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

- **TheresMac**: `https://theresmac-backend.fly.dev/api/products`
- **GPU Drip**: `https://gpudrip-backend-icy-night-2201.fly.dev/api/gpus`

## Data Structures

### TheresMac Response
```json
{
  "id": "macbook-pro-14-m5",
  "name": "MacBook Pro 14\"",
  "sku": "MP5X3LL/A",
  "msrp": 1999,
  "prices": {
    "amazon": {"price": 1949, "inStock": true, "verified": false},
    "apple": {"price": 1999, "inStock": true, "verified": false},
    "backmarket": {"price": 1899, "inStock": true, "verified": false}
  }
}
```

### GPU Drip Response
```json
{
  "id": "rtx-5090",
  "model": "RTX 5090",
  "msrp_usd": 1999,
  "retailers": {
    "amazon": {"price": 2399, "inStock": false, "verified": false, "url": "..."},
    "bestbuy": {"price": 2399, "inStock": false, "verified": false, "url": "..."}
  }
}
```

## Rate Limiting

- **Default delay**: 0.5s between requests (2 req/sec)
- **Max retries**: 3 attempts with exponential backoff
- **Base retry delay**: 2s (doubles each retry)
- **User-Agent**: Standard browser headers

## Deal Thresholds

- **Deal**: Price ≤ 10% below MSRP
- **Premium**: Price ≥ 15% above MSRP

## Output Files

| File | Description |
|------|-------------|
| `price_monitor.py` | Main monitoring script |
| `url_checker.py` | URL validation script |
| `run_price_monitor.sh` | Manual run wrapper |
| `price_monitor_results.json` | Machine-readable results |
| `price_monitor_dashboard.html` | Visual dashboard |
| `SCHEDULING.md` | Cron/launchd setup guide |

## Troubleshooting

### Timeout Errors
- Increase `REQUEST_DELAY` in `price_monitor.py`
- Check backend status at `https://theresmac-backend.fly.dev` and `https://gpudrip-backend-icy-night-2201.fly.dev`

### No Deals Showing
- Adjust `DEAL_THRESHOLD_PERCENT` (default: 10%)
- Check `price_monitor_results.json` for raw data

### Cron Not Running
- Check cron logs: `tail -f /tmp/price_monitor.log`
- Verify script is executable: `chmod +x run_price_monitor.sh`
- Test manually first: `./run_price_monitor.sh`

## Next Steps

1. **Set up scheduling** - Add cron job for daily runs
2. **Configure alerts** - Integrate with Telegram/Email for deal notifications
3. **Historical tracking** - Store results for price history charts
4. **Retailer expansion** - Add more retailers as they're approved (B&H, Best Buy, Newegg, Walmart)

## Related Scripts

- `scraper_engine.py` - Legacy Playwright scraper (still available for manual scraping)
- `robust_scraper.py` - Scraper with retry logic
- `api_client.py` - Backend API client for updates

---

Built for Douglas Richman's affiliate sites: **TheresMac** and **GPU Drip**.
