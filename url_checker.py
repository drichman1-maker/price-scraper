"""
URL Redirect Checker for Product Links

Verifies that affiliate and product URLs redirect to the intended product pages.
Detects broken links, wrong redirects, and landing page issues.

Usage:
    python url_checker.py                    # Check all URLs from backends
    python url_checker.py --project theresmac # Single project
    python url_checker.py --retailer amazon   # Single retailer
"""
import asyncio
import aiohttp
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Optional, Set
from urllib.parse import urlparse, parse_qs
import time
import random

# Backend endpoints
BACKENDS = {
    "theresmac": "https://theresmac-backend.fly.dev/api/products",
    "gpudrip": "https://gpudrip-backend-icy-night-2201.fly.dev/api/gpus",
}

# Output file
OUTPUT_FILE = "url_check_results.json"

# Rate limiting
REQUEST_DELAY = 1.0  # seconds between requests
MAX_RETRIES = 2


@dataclass
class URLCheck:
    project: str
    product_id: str
    product_name: str
    retailer: str
    original_url: Optional[str]
    final_url: Optional[str]
    status_code: Optional[int]
    redirect_count: int
    has_product_name: bool
    is_valid: bool
    error: Optional[str]
    checked_at: str


class RateLimiter:
    def __init__(self, delay: float = REQUEST_DELAY):
        self.delay = delay
        self.last_request = 0
    
    async def wait(self):
        elapsed = time.time() - self.last_request
        if elapsed < self.delay:
            await asyncio.sleep(self.delay - elapsed + random.uniform(0.1, 0.3))
        self.last_request = time.time()


async def check_url(session: aiohttp.ClientSession, url: str, product_name: str,
                   limiter: RateLimiter, max_redirects: int = 10) -> Dict:
    """Check URL with redirect following and validation"""
    await limiter.wait()
    
    result = {
        "final_url": None,
        "status_code": None,
        "redirect_count": 0,
        "has_product_name": False,
        "error": None,
    }
    
    try:
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=20),
            allow_redirects=True,
            max_redirects=max_redirects
        ) as resp:
            result["status_code"] = resp.status
            result["final_url"] = str(resp.url)
            
            # Count redirects (compare original and final URLs)
            if resp.url != url:
                # Estimate redirect count (aiohttp doesn't expose it directly)
                result["redirect_count"] = 1  # Simplified
            
            # Check if product name appears in final URL or page
            if product_name:
                # Try to fetch page content for name check
                try:
                    text = await resp.text()
                    # Simple check: does product name appear in page?
                    # Extract key terms from product name
                    terms = [t.lower() for t in product_name.split() if len(t) > 3]
                    result["has_product_name"] = any(t in text.lower() for t in terms)
                except:
                    pass
            
    except asyncio.TimeoutError:
        result["error"] = "Timeout"
    except Exception as e:
        result["error"] = str(e)
    
    return result


async def fetch_products(project: str, session: aiohttp.ClientSession,
                        limiter: RateLimiter) -> List[Dict]:
    """Fetch products from backend"""
    await limiter.wait()
    
    try:
        async with session.get(BACKENDS[project], timeout=20) as resp:
            if resp.status == 200:
                data = await resp.json()
                return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error fetching {project}: {e}")
    
    return []


def extract_theresmac_urls(products: List[Dict]) -> List[Dict]:
    """Extract URLs from TheresMac products"""
    urls = []
    
    for p in products:
        product_id = p.get("id", "")
        product_name = p.get("name", "")
        prices = p.get("prices", {})
        
        for retailer, data in prices.items():
            if data and data.get("url"):
                urls.append({
                    "project": "theresmac",
                    "product_id": product_id,
                    "product_name": product_name,
                    "retailer": retailer,
                    "url": data.get("url"),
                })
    
    return urls


def extract_gpudrip_urls(products: List[Dict]) -> List[Dict]:
    """Extract URLs from GPU Drip products"""
    urls = []
    
    for p in products:
        product_id = p.get("id", "")
        product_name = p.get("model", "")
        retailers = p.get("retailers", {})
        
        for retailer, data in retailers.items():
            if data and data.get("url"):
                urls.append({
                    "project": "gpudrip",
                    "product_id": product_id,
                    "product_name": product_name,
                    "retailer": retailer,
                    "url": data.get("url"),
                })
    
    return urls


async def check_urls(url_list: List[Dict], limiter: RateLimiter) -> List[URLCheck]:
    """Check all URLs in the list"""
    checks = []
    
    async with aiohttp.ClientSession() as session:
        for item in url_list:
            result = await check_url(
                session,
                item["url"],
                item["product_name"],
                limiter
            )
            
            is_valid = (
                result["status_code"] == 200 and
                not result["error"] and
                result["has_product_name"]
            )
            
            checks.append(URLCheck(
                project=item["project"],
                product_id=item["product_id"],
                product_name=item["product_name"],
                retailer=item["retailer"],
                original_url=item["url"],
                final_url=result["final_url"],
                status_code=result["status_code"],
                redirect_count=result["redirect_count"],
                has_product_name=result["has_product_name"],
                is_valid=is_valid,
                error=result["error"],
                checked_at=datetime.now().isoformat(),
            ))
            
            # Progress indicator
            if len(checks) % 10 == 0:
                print(f"  Checked {len(checks)} URLs...")
    
    return checks


def generate_report(checks: List[URLCheck]) -> str:
    """Generate text report"""
    valid = [c for c in checks if c.is_valid]
    invalid = [c for c in checks if not c.is_valid]
    
    lines = [
        "="*70,
        "URL CHECK REPORT",
        "="*70,
        f"Total URLs checked: {len(checks)}",
        f"Valid: {len(valid)} ({len(valid)/len(checks)*100:.1f}%)",
        f"Invalid: {len(invalid)} ({len(invalid)/len(checks)*100:.1f}%)",
        "",
        "="*70,
        "INVALID URLS",
        "="*70,
    ]
    
    for c in sorted(invalid, key=lambda x: (x.project, x.retailer)):
        status = f"HTTP {c.status_code}" if c.status_code else c.error or "Unknown"
        lines.append(f"\n{c.project.upper()} - {c.retailer}")
        lines.append(f"  Product: {c.product_name}")
        lines.append(f"  URL: {c.original_url}")
        lines.append(f"  Status: {status}")
        if c.final_url and c.final_url != c.original_url:
            lines.append(f"  Redirected to: {c.final_url}")
        if not c.has_product_name and c.status_code == 200:
            lines.append(f"  ⚠️  Product name not found on page")
    
    lines.extend([
        "",
        "="*70,
        f"VALID URLS ({len(valid)})", 
        "="*70,
    ])
    
    for c in sorted(valid, key=lambda x: (x.project, x.retailer))[:20]:
        lines.append(f"  ✅ {c.project:12s} {c.retailer:15s} {c.product_name[:40]}")
    
    if len(valid) > 20:
        lines.append(f"  ... and {len(valid) - 20} more")
    
    return "\n".join(lines)


async def main():
    import sys
    
    # Parse args
    project_filter = None
    retailer_filter = None
    
    for i, arg in enumerate(sys.argv):
        if arg == "--project" and i + 1 < len(sys.argv):
            project_filter = sys.argv[i + 1]
        elif arg == "--retailer" and i + 1 < len(sys.argv):
            retailer_filter = sys.argv[i + 1]
    
    print("="*70)
    print("URL REDIRECT CHECKER")
    print("="*70)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S EST')}")
    print()
    
    limiter = RateLimiter()
    all_urls = []
    
    async with aiohttp.ClientSession() as session:
        projects = [project_filter] if project_filter in BACKENDS else list(BACKENDS.keys())
        
        for project in projects:
            print(f"\nFetching {project.upper()} products...")
            products = await fetch_products(project, session, limiter)
            print(f"  Found {len(products)} products")
            
            if project == "theresmac":
                all_urls.extend(extract_theresmac_urls(products))
            else:
                all_urls.extend(extract_gpudrip_urls(products))
        
        # Filter by retailer if specified
        if retailer_filter:
            all_urls = [u for u in all_urls if u["retailer"] == retailer_filter]
        
        print(f"\nTotal URLs to check: {len(all_urls)}")
        print(f"Checking URLs (this will take {len(all_urls)*REQUEST_DELAY:.0f}s)...\n")
        
        checks = await check_urls(all_urls, limiter)
    
    # Generate report
    report = generate_report(checks)
    print(report)
    
    # Save results
    results = {
        "check_time": datetime.now().isoformat(),
        "total_urls": len(checks),
        "valid_count": sum(1 for c in checks if c.is_valid),
        "invalid_count": sum(1 for c in checks if not c.is_valid),
        "checks": [asdict(c) for c in checks],
    }
    
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())
