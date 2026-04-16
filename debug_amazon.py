#!/usr/bin/env python3
"""Debug script to see what Amazon returns"""
import requests
import re

url = "https://www.amazon.com/s?k=RTX+4090"

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Length: {len(response.text)}")

    # Save to file for inspection
    with open('debug_amazon.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    print("Saved to debug_amazon.html")

    # Check for CAPTCHA
    if 'captcha' in response.text.lower() or 'type the characters' in response.text.lower():
        print("\n🚨 CAPTCHA DETECTED - Direct requests are blocked.")
    else:
        # Look for price patterns
        prices = re.findall(r'\$[\d,]+\.\d{2}', response.text)
        print(f"\nFound {len(prices)} price patterns.")
        if prices:
            print("Sample prices:", prices[:5])

except Exception as e:
    print(f"Error: {e}")
