#!/usr/bin/env python3
"""
Main runner using the RobustScraper (HTTP + Regex).
Works without Playwright or proxies.
"""
import asyncio
import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional

# Import our new scraper
from robust_scraper import RobustScraper, ScrapedProduct
from api_client import BackendAPIClient

# SKU to Search Query Mapping
SEARCH_QUERIES = {
    # GPUs
    "rtx-5090": "RTX 5090",
    "rtx-5080": "RTX 5080",
    "rtx-5070-ti": "RTX 5070 Ti",
    "rtx-5070": "RTX 5070",
    "rtx-5060-ti": "RTX 5060 Ti",
    "rtx-5060": "RTX 5060",
    "rtx-4090": "RTX 4090",
    "rtx-4080-super": "RTX 4080 Super",
    "rtx-4080": "RTX 4080",
    "rtx-4070-ti-super": "RTX 4070 Ti Super",
    "rtx-4070-ti": "RTX 4070 Ti",
    "rtx-4070-super": "RTX 4070 Super",
    "rtx-4070": "RTX 4070",
    "rx-9070-xt": "RX 9070 XT",
    "rx-9070": "RX 9070",
    "rx-7900-xtx": "RX 7900 XTX",
    "rx-7900-xt": "RX 7900 XT",
    # Macs
    "macbook-pro-14-m5": "MacBook Pro 14 M5",
    "macbook-pro-14-m5-pro": "MacBook Pro 14 M5 Pro",
    "macbook-pro-14-m5-max": "MacBook Pro 14 M5 Max",
    "macbook-pro-16-m5": "MacBook Pro 16 M5",
    "macbook-pro-14-m5-1tb": "MacBook Pro 14 M5 1TB",
    "macbook-pro-16-m5-1tb": "MacBook Pro 16 M5 1TB",
    # Refurbished (older chips)
    "macbook-pro-14-m3-refurbished": "MacBook Pro 14 M3 refurbished",
    "macbook-air-13-m2-refurbished": "MacBook Air 13 M2 refurbished",
}

# Price filters (min, max) to filter out irrelevant results
PRICE_FILTERS = {
    "rtx-4090": (1500, 2500),
    "rtx-4080-super": (800, 1500),
    "rtx-4080": (700, 1400),
    "rtx-4070-ti-super": (600, 1000),
    "rtx-4070-super": (500, 900),
    "rtx-4070": (400, 800),
    "rx-7900-xtx": (800, 1500),
    # Macs - New M5 chips (latest, higher prices)
    "macbook-pro-14-m5": (2000, 4000),
    "macbook-pro-14-m5-pro": (2500, 5000),
    "macbook-pro-14-m5-max": (3000, 6000),
    "macbook-pro-16-m5": (2500, 5000),
    "macbook-pro-14-m5-1tb": (2200, 4500),
    "macbook-pro-16-m5-1tb": (2700, 5500),
    # Refurbished (older chips, lower prices)
    "macbook-pro-14-m3-refurbished": (1500, 3000),
    "macbook-air-13-m2-refurbished": (600, 1400),
}

def get_search_query(sku: str) -> str:
    """Get search query for SKU, or fallback to SKU itself"""
    return SEARCH_QUERIES.get(sku, sku.replace('-', ' '))

def get_price_filter(sku: str):
    """Get price range filter for SKU"""
    return PRICE_FILTERS.get(sku, (None, None))

def load_product_json(project: str) -> Dict:
    """Load product mapping JSON file"""
    filename = f"{project}-products.json"
    if not os.path.exists(filename):
        print(f"Warning: {filename} not found. No products to scrape.")
        return {}
    with open(filename, 'r') as f:
        return json.load(f)

def get_product_msrp(project: str, sku: str) -> Optional[float]:
    """Get MSRP for a product SKU from product JSON"""
    products = load_product_json(project)
    if sku in products and products[sku]:
        return products[sku][0].get('msrp')
    return None

async def run_robust_scraper(project: str):
    print(f"\n{'='*60}")
    print(f"ROBUST SCRAPER - {project.upper()}")
    print(f"{'='*60}")

    # Load products
    products = load_product_json(project)
    if not products:
        print("No products found.")
        return

    scraper = RobustScraper()
    scraped_data: List[ScrapedProduct] = []
    results = {"total": 0, "success": 0, "failed": 0, "errors": []}

    # Scrape each product
    for sku, urls in products.items():
        print(f"\n[{sku}] Processing...")
        results["total"] += 1

        query = get_search_query(sku)
        price_min, price_max = get_price_filter(sku)
        msrp = get_product_msrp(project, sku)

        # We only care about retailers we have configs for (Amazon, eBay)
        # The JSON file lists URLs, but we are doing search-based scraping
        # so we'll just scrape Amazon and eBay for each SKU regardless of the URL in the file

        # Scrape Amazon
        amazon_result = scraper.search_amazon(query, price_min, price_max)
        amazon_result.sku = sku  # Ensure SKU is set
        amazon_result.msrp = msrp  # Attach MSRP
        scraped_data.append(amazon_result)

        if amazon_result.error:
            print(f"  Amazon: ❌ {amazon_result.error}")
            results["failed"] += 1
            results["errors"].append(f"{sku} (Amazon): {amazon_result.error}")
        else:
            msrp_display = f" | MSRP: ${msrp}" if msrp else ""
            print(f"  Amazon: ✅ ${amazon_result.price}{msrp_display}")
            results["success"] += 1

        # Scrape eBay (optional, add if needed)
        # ebay_result = scraper.search_ebay(query)
        # ebay_result.sku = sku
        # scraped_data.append(ebay_result)

    # Show Alerts (no backend update)
    print(f"\n{'='*60}")
    print("UPDATING BACKEND...")
    print(f"{'='*60}")

    try:
        async with BackendAPIClient(project) as api:
            update_results = await api.update_prices_batch(scraped_data)
    except Exception as e:
        print(f"⚠️ Alert display error: {e}")
        update_results = []

    # Summary
    success_count = sum(1 for r in update_results if r.get("success"))
    print(f"\n{'='*60}")
    print(f"SUMMARY: {results['success']}/{results['total']} scraped successfully")
    print(f"✅ {success_count} products with valid prices")
    print(f"{'='*60}")

async def main():
    parser_name = "run_robust_scraper"

    if len(sys.argv) > 1:
        project = sys.argv[1]
    else:
        print(f"Usage: python3 {parser_name} <theresmac|gpudrip>")
        return

    await run_robust_scraper(project)

if __name__ == "__main__":
    asyncio.run(main())
