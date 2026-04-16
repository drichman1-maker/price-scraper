"""
Unified Price & Stock Monitor for TheresMac and GPU Drip

Fetches live prices from both backends, compares to MSRP, detects deals,
and persists results to JSON + HTML dashboard.

Usage:
    python price_monitor.py              # Full scan + report
    python price_monitor.py --alert-only  # Only show deals
    python price_monitor.py --project theresmac  # Single project
"""
import asyncio
import aiohttp
import json
import time
import random
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Optional, Set
from pathlib import Path

# Backend endpoints
BACKENDS = {
    "theresmac": "https://theresmac-backend.fly.dev/api/products",
    "gpudrip": "https://gpudrip-backend-icy-night-2201.fly.dev/api/gpus",
}

# Output files
OUTPUT_DIR = Path(__file__).parent
RESULTS_FILE = OUTPUT_DIR / "price_monitor_results.json"
DASHBOARD_FILE = OUTPUT_DIR / "price_monitor_dashboard.html"

# Rate limiting
REQUEST_DELAY = 0.5  # seconds between requests
MAX_RETRIES = 3
RETRY_DELAY = 2  # base delay for exponential backoff

# Deal thresholds
DEAL_THRESHOLD_PERCENT = 10  # Show deals >= 10% off MSRP
PREMIUM_THRESHOLD_PERCENT = 15  # Alert if price >= 15% above MSRP


@dataclass
class ProductPrice:
    project: str  # "theresmac" or "gpudrip"
    product_id: str
    product_name: str
    sku: Optional[str]
    msrp: float
    retailer: str
    price: Optional[float]
    in_stock: bool
    verified: bool
    affiliate_url: Optional[str]
    discount_percent: Optional[float]  # Negative = premium
    is_deal: bool
    is_premium: bool
    scanned_at: str


@dataclass
class ScanSummary:
    project: str
    total_products: int
    total_prices: int
    in_stock: int
    deals: int
    premiums: int
    scan_time: str
    top_deals: List[Dict]


class RateLimiter:
    """Simple rate limiter for API calls"""
    
    def __init__(self, delay: float = REQUEST_DELAY):
        self.delay = delay
        self.last_request = 0
    
    async def wait(self):
        elapsed = time.time() - self.last_request
        if elapsed < self.delay:
            await asyncio.sleep(self.delay - elapsed + random.uniform(0.1, 0.3))
        self.last_request = time.time()


async def fetch_with_retry(session: aiohttp.ClientSession, url: str, 
                          limiter: RateLimiter, max_retries: int = MAX_RETRIES) -> Optional[Dict]:
    """Fetch with exponential backoff retry"""
    for attempt in range(max_retries):
        try:
            await limiter.wait()
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=20)) as resp:
                if resp.status == 200:
                    return await resp.json()
                elif resp.status in [429, 503, 504]:
                    # Rate limited or service unavailable - retry with backoff
                    wait_time = RETRY_DELAY * (2 ** attempt) + random.uniform(0, 1)
                    print(f"  Rate limited ({resp.status}), retry {attempt+1}/{max_retries} in {wait_time:.1f}s...")
                    await asyncio.sleep(wait_time)
                else:
                    print(f"  HTTP {resp.status}: {url}")
                    return None
        except asyncio.TimeoutError:
            print(f"  Timeout on {url}, retry {attempt+1}/{max_retries}...")
            await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
        except Exception as e:
            print(f"  Error: {e}, retry {attempt+1}/{max_retries}...")
            await asyncio.sleep(RETRY_DELAY * (2 ** attempt))
    
    print(f"  Failed after {max_retries} retries: {url}")
    return None


def parse_theresmac_product(p: Dict) -> List[ProductPrice]:
    """Parse TheresMac product into price entries"""
    prices = []
    msrp = p.get("msrp", 0) or 0
    retailer_prices = p.get("prices", {})
    
    for retailer, data in retailer_prices.items():
        price = data.get("price") if data else None
        in_stock = data.get("inStock", False) if data else False
        verified = data.get("verified", False) if data else False
        
        if price is None:
            continue
        
        discount = ((msrp - price) / msrp * 100) if msrp > 0 else 0
        is_deal = discount >= DEAL_THRESHOLD_PERCENT
        is_premium = discount <= -PREMIUM_THRESHOLD_PERCENT
        
        prices.append(ProductPrice(
            project="theresmac",
            product_id=p.get("id", ""),
            product_name=p.get("name", ""),
            sku=p.get("sku", ""),
            msrp=msrp,
            retailer=retailer,
            price=price,
            in_stock=in_stock,
            verified=verified,
            affiliate_url=None,  # Not in API
            discount_percent=round(discount, 1),
            is_deal=is_deal,
            is_premium=is_premium,
            scanned_at=datetime.now().isoformat(),
        ))
    
    return prices


def parse_gpudrip_product(p: Dict) -> List[ProductPrice]:
    """Parse GPU Drip product into price entries"""
    prices = []
    msrp = p.get("msrp_usd", 0) or 0
    retailers = p.get("retailers", {})
    
    for retailer, data in retailers.items():
        if not data:
            continue
        
        price = data.get("price")
        in_stock = data.get("inStock", False)
        verified = data.get("verified", False)
        url = data.get("url")
        
        if price is None:
            continue
        
        discount = ((msrp - price) / msrp * 100) if msrp > 0 else 0
        is_deal = discount >= DEAL_THRESHOLD_PERCENT
        is_premium = discount <= -PREMIUM_THRESHOLD_PERCENT
        
        prices.append(ProductPrice(
            project="gpudrip",
            product_id=p.get("id", ""),
            product_name=p.get("model", ""),
            sku=p.get("slug", ""),
            msrp=msrp,
            retailer=retailer,
            price=price,
            in_stock=in_stock,
            verified=verified,
            affiliate_url=url,
            discount_percent=round(discount, 1),
            is_deal=is_deal,
            is_premium=is_premium,
            scanned_at=datetime.now().isoformat(),
        ))
    
    return prices


async def scan_project(project: str, limiter: RateLimiter, 
                      session: aiohttp.ClientSession) -> ScanSummary:
    """Scan a single project and return summary"""
    url = BACKENDS[project]
    print(f"\n{'='*60}")
    print(f"Scanning {project.upper()}")
    print(f"{'='*60}")
    
    data = await fetch_with_retry(session, url, limiter)
    if not data:
        print(f"Failed to fetch {project}")
        return ScanSummary(
            project=project,
            total_products=0,
            total_prices=0,
            in_stock=0,
            deals=0,
            premiums=0,
            scan_time=datetime.now().isoformat(),
            top_deals=[],
        )
    
    products = data if isinstance(data, list) else []
    
    all_prices: List[ProductPrice] = []
    for p in products:
        if project == "theresmac":
            all_prices.extend(parse_theresmac_product(p))
        else:
            all_prices.extend(parse_gpudrip_product(p))
    
    # Calculate stats
    in_stock = sum(1 for pp in all_prices if pp.in_stock)
    deals = [pp for pp in all_prices if pp.is_deal]
    premiums = [pp for pp in all_prices if pp.is_premium]
    
    # Sort deals by discount
    top_deals = sorted(
        [{"product_id": pp.product_id, "name": pp.product_name, "retailer": pp.retailer,
          "msrp": pp.msrp, "price": pp.price, "discount": pp.discount_percent,
          "in_stock": pp.in_stock} for pp in deals],
        key=lambda x: x["discount"],
        reverse=True
    )[:10]
    
    print(f"Products: {len(products)}")
    print(f"Price points: {len(all_prices)}")
    print(f"In stock: {in_stock}")
    print(f"Deals (≥{DEAL_THRESHOLD_PERCENT}% off): {len(deals)}")
    print(f"Premiums (≥{PREMIUM_THRESHOLD_PERCENT}% above MSRP): {len(premiums)}")
    
    return ScanSummary(
        project=project,
        total_products=len(products),
        total_prices=len(all_prices),
        in_stock=in_stock,
        deals=len(deals),
        premiums=len(premiums),
        scan_time=datetime.now().isoformat(),
        top_deals=top_deals,
    )


def generate_html_dashboard(prices: List[ProductPrice], summaries: List[ScanSummary]) -> str:
    """Generate HTML dashboard"""
    
    # Group by project
    by_project = {"theresmac": [], "gpudrip": []}
    for pp in prices:
        if pp.project in by_project:
            by_project[pp.project].append(pp)
    
    # Sort by discount (deals first)
    def sort_key(pp):
        return (-pp.discount_percent or 0, not pp.in_stock)
    
    tm_prices = sorted(by_project["theresmac"], key=sort_key)
    gd_prices = sorted(by_project["gpudrip"], key=sort_key)
    
    def render_price_row(pp: ProductPrice) -> str:
        discount_class = "text-green-600" if (pp.discount_percent or 0) > 0 else "text-red-600"
        discount_text = f"{pp.discount_percent:+.1f}%" if pp.discount_percent is not None else "N/A"
        stock_badge = '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">IN STOCK</span>' if pp.in_stock else '<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">OUT</span>'
        deal_badge = '<span class="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">DEAL</span>' if pp.is_deal else ''
        premium_badge = '<span class="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold">PREMIUM</span>' if pp.is_premium else ''
        
        return f"""
        <tr class="border-b hover:bg-gray-50">
            <td class="px-4 py-3 text-sm">{pp.product_name[:40]}...</td>
            <td class="px-4 py-3 text-sm">{pp.retailer}</td>
            <td class="px-4 py-3 text-sm font-mono">${pp.msrp:.0f}</td>
            <td class="px-4 py-3 text-sm font-mono font-bold">${pp.price:.0f}</td>
            <td class="px-4 py-3 text-sm font-bold {discount_class}">{discount_text}</td>
            <td class="px-4 py-3">{stock_badge}{deal_badge}{premium_badge}</td>
            <td class="px-4 py-3 text-xs text-gray-500">{pp.scanned_at[:19].replace('T', ' ')}</td>
        </tr>
        """
    
    tm_rows = "\n".join(render_price_row(pp) for pp in tm_prices[:50])
    gd_rows = "\n".join(render_price_row(pp) for pp in gd_prices[:50])
    
    summary_html = "\n".join(f"""
    <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-bold text-lg mb-2">{s.project.upper()}</h3>
        <div class="grid grid-cols-4 gap-4 text-sm">
            <div><span class="text-gray-500">Products:</span> <span class="font-bold">{s.total_products}</span></div>
            <div><span class="text-gray-500">Price Points:</span> <span class="font-bold">{s.total_prices}</span></div>
            <div><span class="text-gray-500">In Stock:</span> <span class="font-bold text-green-600">{s.in_stock}</span></div>
            <div><span class="text-gray-500">Deals:</span> <span class="font-bold text-yellow-600">{s.deals}</span></div>
        </div>
    </div>
    """ for s in summaries)
    
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Price Monitor Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
        <h1 class="text-3xl font-bold mb-2">Price & Stock Monitor</h1>
        <p class="text-gray-600 mb-6">Last scan: {datetime.now().strftime('%Y-%m-%d %H:%M:%S EST')}</p>
        
        <div class="grid grid-cols-2 gap-4 mb-8">
            {summary_html}
        </div>
        
        <div class="grid grid-cols-2 gap-8">
            <div class="bg-white rounded-lg shadow">
                <div class="bg-gray-800 text-white px-4 py-3 font-bold">
                    TheresMac (Top {len(tm_rows)} Deals)
                </div>
                <table class="w-full text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left">Product</th>
                            <th class="px-4 py-2 text-left">Retailer</th>
                            <th class="px-4 py-2 text-left">MSRP</th>
                            <th class="px-4 py-2 text-left">Price</th>
                            <th class="px-4 py-2 text-left">Discount</th>
                            <th class="px-4 py-2 text-left">Stock</th>
                            <th class="px-4 py-2 text-left">Scanned</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tm_rows}
                    </tbody>
                </table>
            </div>
            
            <div class="bg-white rounded-lg shadow">
                <div class="bg-gray-800 text-white px-4 py-3 font-bold">
                    GPU Drip (Top {len(gd_rows)} Deals)
                </div>
                <table class="w-full text-sm">
                    <thead class="bg-gray-100">
                        <tr>
                            <th class="px-4 py-2 text-left">Product</th>
                            <th class="px-4 py-2 text-left">Retailer</th>
                            <th class="px-4 py-2 text-left">MSRP</th>
                            <th class="px-4 py-2 text-left">Price</th>
                            <th class="px-4 py-2 text-left">Discount</th>
                            <th class="px-4 py-2 text-left">Stock</th>
                            <th class="px-4 py-2 text-left">Scanned</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gd_rows}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>
    """
    
    return html


async def main():
    """Main monitoring loop"""
    import sys
    
    # Parse args
    alert_only = "--alert-only" in sys.argv
    project_filter = None
    for i, arg in enumerate(sys.argv):
        if arg == "--project" and i + 1 < len(sys.argv):
            project_filter = sys.argv[i + 1]
    
    projects = [project_filter] if project_filter in BACKENDS else list(BACKENDS.keys())
    
    print(f"\n{'='*60}")
    print(f"PRICE MONITOR - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    limiter = RateLimiter()
    all_prices: List[ProductPrice] = []
    summaries: List[ScanSummary] = []
    
    async with aiohttp.ClientSession() as session:
        for project in projects:
            summary = await scan_project(project, limiter, session)
            summaries.append(summary)
            
            # Re-fetch detailed data for this project
            data = await fetch_with_retry(session, BACKENDS[project], limiter)
            if data:
                products = data if isinstance(data, list) else []
                for p in products:
                    if project == "theresmac":
                        all_prices.extend(parse_theresmac_product(p))
                    else:
                        all_prices.extend(parse_gpudrip_product(p))
    
    # Print deals
    deals = [pp for pp in all_prices if pp.is_deal]
    premiums = [pp for pp in all_prices if pp.is_premium]
    
    if deals or premiums:
        print(f"\n{'='*60}")
        print(f"DEALS & PREMIUM ALERTS")
        print(f"{'='*60}")
        
        for pp in sorted(deals, key=lambda x: x.discount_percent or 0, reverse=True)[:20]:
            print(f"  🎉 {pp.project.upper()} | {pp.product_name[:40]:40s}")
            print(f"     {pp.retailer:15s} | ${pp.msrp:.0f} → ${pp.price:.0f} ({pp.discount_percent:+.1f}%) | {'IN STOCK' if pp.in_stock else 'OUT'}")
        
        for pp in sorted(premiums, key=lambda x: x.discount_percent or 0)[:10]:
            print(f"  ⚠️  {pp.project.upper()} | {pp.product_name[:40]:40s}")
            print(f"     {pp.retailer:15s} | ${pp.msrp:.0f} → ${pp.price:.0f} ({pp.discount_percent:+.1f}%) | PREMIUM PRICING")
    else:
        print(f"\n✅ No deals or premium pricing detected")
    
    # Save results
    results = {
        "scan_time": datetime.now().isoformat(),
        "summaries": [asdict(s) for s in summaries],
        "prices": [asdict(pp) for pp in all_prices],
        "deals_count": len(deals),
        "premiums_count": len(premiums),
    }
    
    RESULTS_FILE.write_text(json.dumps(results, indent=2))
    print(f"\n💾 Results saved to {RESULTS_FILE}")
    
    # Generate dashboard
    html = generate_html_dashboard(all_prices, summaries)
    DASHBOARD_FILE.write_text(html)
    print(f"📊 Dashboard saved to {DASHBOARD_FILE}")
    
    print(f"\n{'='*60}")
    print(f"SCAN COMPLETE")
    print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
