#!/usr/bin/env python3
"""Quick test scraper"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

# Set test environment
os.environ['THERESMAC_API_URL'] = 'https://theresmac-backend.fly.dev'
os.environ['THERESMAC_API_KEY'] = 'kTT9f4MP4nisVi2tNiP0ismcr44mBeOMOVhlGm4hcPA'
os.environ['AMAZON_AFFILIATE_ID'] = 'Theresmac-20'

from scraper_engine import ScraperEngine

async def test():
    print("="*60)
    print("TESTING SCRAPER - MacBook Air M3 Amazon")
    print("="*60)
    
    test_sku = "macbook-air-13-m3-test"
    test_url = "https://www.amazon.com/dp/B0CX23V2ZK"
    
    print(f"\nProduct: {test_sku}")
    print(f"URL: {test_url}")
    print("\nScraping (10-30 seconds)...")
    
    async with ScraperEngine(use_proxy=False) as engine:
        result = await engine.scrape_amazon(test_sku, test_url)
        
        print("\n" + "-"*60)
        print("RESULTS:")
        print("-"*60)
        
        if result.error:
            print(f"❌ ERROR: {result.error}")
        else:
            print(f"✅ SUCCESS!")
            print(f"   Title: {result.title if result.title else 'N/A'}")
            print(f"   Price: ${result.price}")
            print(f"   Stock: {result.in_stock}")
        
        return result

if __name__ == "__main__":
    result = asyncio.run(test())
    print("\nTest complete!")