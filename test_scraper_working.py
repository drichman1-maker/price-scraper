#!/usr/bin/env python3
"""Quick test scraper with real products"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

# Load product mappings
with open('gpudrip-products.json', 'r') as f:
    gpudrip_products = json.load(f)

with open('theresmac-products.json', 'r') as f:
    theresmac_products = json.load(f)

from scraper_engine import ScraperEngine

async def test_gpu():
    print("="*60)
    print("TESTING SCRAPER - GPU Drip (RTX 4090)")
    print("="*60)
    
    # Get first URL for RTX 4090
    sku = 'rtx-4090'
    urls = gpudrip_products.get(sku, [])
    
    if not urls:
        print(f"ERROR: No URLs found for {sku}")
        return None
    
    # Test Amazon
    retailer_info = urls[0]
    retailer = retailer_info['retailer']
    url = retailer_info['url']
    
    print(f"\nProduct: {sku}")
    print(f"Retailer: {retailer}")
    print(f"URL: {url}")
    print("\nScraping (10-30 seconds)...")
    
    async with ScraperEngine(use_proxy=False) as engine:
        result = await engine.scrape_product(sku, retailer, url)
        
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
            print(f"   Condition: {result.condition}")
        
        return result

async def test_mac():
    print("\n\n" + "="*60)
    print("TESTING SCRAPER - TheresMac (MacBook Pro 14 M5)")
    print("="*60)
    
    # Get first URL for MacBook Pro 14 M5
    sku = 'macbook-pro-14-m5'
    urls = theresmac_products.get(sku, [])
    
    if not urls:
        print(f"ERROR: No URLs found for {sku}")
        return None
    
    # Test Amazon search
    retailer_info = urls[0]
    retailer = retailer_info['retailer']
    url = retailer_info['url']
    
    print(f"\nProduct: {sku}")
    print(f"Retailer: {retailer}")
    print(f"URL: {url}")
    print("\nScraping (10-30 seconds)...")
    
    async with ScraperEngine(use_proxy=False) as engine:
        result = await engine.scrape_product(sku, retailer, url)
        
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
            print(f"   Condition: {result.condition}")
        
        return result

async def main():
    # Test GPU Drip
    gpu_result = await test_gpu()
    
    # Test TheresMac
    mac_result = await test_mac()
    
    print("\n\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"GPU Drip (RTX 4090): {'✅ PASS' if gpu_result and not gpu_result.error else '❌ FAIL'}")
    print(f"TheresMac (MacBook): {'✅ PASS' if mac_result and not mac_result.error else '❌ FAIL'}")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
