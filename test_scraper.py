#!/usr/bin/env python3
"""
Test script for scraper - run locally before pushing to GitHub
"""

import asyncio
import json
import os
from scraper_engine import ScraperEngine, ScrapedProduct

# Test URLs (use real product URLs)
TEST_URLS = {
    "amazon": [
        {
            "sku": "macbook-air-15-m3-2024",
            "url": "https://www.amazon.com/dp/B0CX23V2ZK"  # MacBook Air 15" M3
        }
    ],
    "ebay": [
        {
            "sku": "rtx-4090",
            "url": "https://www.ebay.com/sch/i.html?_nkw=RTX+4090"  # Search page
        }
    ]
}


async def test_scraper_engine():
    """Test the scraper engine locally"""
    print("="*60)
    print("TESTING SCRAPER ENGINE")
    print("="*60)
    
    results = []
    
    async with ScraperEngine(use_proxy=False) as engine:
        # Test Amazon scraping
        print("\n🧪 Testing Amazon scraper...")
        for item in TEST_URLS["amazon"]:
            print(f"\n  Scraping: {item['sku']}")
            print(f"  URL: {item['url'][:60]}...")
            
            result = await engine.scrape_amazon(item["sku"], item["url"])
            results.append(result)
            
            if result.error:
                print(f"  ❌ ERROR: {result.error}")
            else:
                print(f"  ✅ SUCCESS:")
                print(f"     Title: {result.title[:50]}..." if result.title and len(result.title) > 50 else f"     Title: {result.title}")
                print(f"     Price: ${result.price}")
                print(f"     Stock: {result.in_stock}")
                print(f"     Condition: {result.condition}")
        
        # Test eBay scraping
        print("\n🧪 Testing eBay scraper...")
        for item in TEST_URLS["ebay"]:
            print(f"\n  Scraping: {item['sku']}")
            print(f"  URL: {item['url'][:60]}...")
            
            result = await engine.scrape_ebay(item["sku"], item["url"])
            results.append(result)
            
            if result.error:
                print(f"  ❌ ERROR: {result.error}")
            else:
                print(f"  ✅ SUCCESS:")
                print(f"     Title: {result.title[:50]}..." if result.title and len(result.title) > 50 else f"     Title: {result.title}")
                print(f"     Price: ${result.price}")
                print(f"     Stock: {result.in_stock}")
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    success = sum(1 for r in results if not r.error and r.price)
    failed = len(results) - success
    print(f"Total tests: {len(results)}")
    print(f"Successful: {success}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\n⚠️  Some tests failed. Common issues:")
        print("   - CAPTCHA detection (enable proxy with --proxy)")
        print("   - Product page structure changed")
        print("   - Rate limiting (wait a few minutes and retry)")
        print("   - Invalid product URLs")
    
    return results


async def test_backend_api():
    """Test backend API connection"""
    from api_client import BackendAPIClient
    
    print("\n" + "="*60)
    print("TESTING BACKEND API CONNECTION")
    print("="*60)
    
    # Check environment
    theresmac_url = os.getenv("THERESMAC_API_URL")
    gpudrip_url = os.getenv("GPUDRIP_API_URL")
    api_key = os.getenv("THERESMAC_API_KEY")
    
    if not theresmac_url or not api_key:
        print("\n⚠️  Missing environment variables. Set:")
        print("   export THERESMAC_API_URL='https://your-backend.fly.dev'")
        print("   export THERESMAC_API_KEY='your-secret-key'")
        return
    
    async with BackendAPIClient("theresmac") as api:
        print(f"\n🌐 Connecting to: {theresmac_url}")
        
        # Test getting products
        products = await api.get_products()
        print(f"📦 Found {len(products)} products")
        
        if products:
            print(f"   First product: {products[0].get('name', 'Unknown')}")
        
        # Test price update (dry run - no actual update)
        test_product = ScrapedProduct(
            sku="test-product",
            retailer="amazon",
            price=999.99,
            in_stock=True,
            condition="New"
        )
        
        print("\n📝 Testing price update (dry run)...")
        # Note: This will fail because "test-product" doesn't exist
        # But it tests the API connection
        result = await api.update_price(test_product)
        
        if result.get("status") == 404 or "not found" in result.get("error", "").lower():
            print("   ✅ API connection working (404 is expected for test product)")
        elif result.get("success"):
            print("   ✅ Price update successful")
        else:
            print(f"   ❌ Error: {result.get('error', 'Unknown error')}")


def main():
    """Main test runner"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test price scraper locally")
    parser.add_argument("--scraper", action="store_true", help="Test scraper engine only")
    parser.add_argument("--api", action="store_true", help="Test backend API only")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    
    args = parser.parse_args()
    
    if not any([args.scraper, args.api, args.all]):
        print("Usage: python test_scraper.py --all")
        print("       python test_scraper.py --scraper")
        print("       python test_scraper.py --api")
        return
    
    if args.scraper or args.all:
        asyncio.run(test_scraper_engine())
    
    if args.api or args.all:
        asyncio.run(test_backend_api())


if __name__ == "__main__":
    main()