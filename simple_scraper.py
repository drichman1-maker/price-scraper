#!/usr/bin/env python3
"""
Simple price scraper using HTTP requests (fallback when Playwright fails)
This is a simpler approach that can be extended with proxy services
"""
import requests
import re
import json
import asyncio
from typing import Dict, Optional, List
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ScrapedProduct:
    sku: str
    retailer: str
    price: Optional[float] = None
    currency: str = "USD"
    title: Optional[str] = None
    in_stock: bool = False
    condition: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None

class SimpleScraper:
    """Simple HTTP-based scraper (can use proxies)"""

    def __init__(self, use_proxy: bool = False):
        self.use_proxy = use_proxy
        self.session = requests.Session()
        # Add realistic headers
from config import get_random_user_agent

self.session.headers.update({
    'User-Agent': get_random_user_agent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
        })

    def scrape_amazon(self, sku: str, url: str) -> ScrapedProduct:
        """Scrape Amazon using requests (may need proxy)"""
        product = ScrapedProduct(sku=sku, retailer="amazon", url=url)

        try:
            # Add delay to avoid rate limiting
            import time
            time.sleep(2)

            response = self.session.get(url, timeout=10)

            if response.status_code >= 400:
                product.error = f"HTTP {response.status_code}"
                return product

            html = response.text

            # Check for CAPTCHA or blocking
            if 'Type the characters you see in this image' in html or 'captcha' in html.lower():
                product.error = "CAPTCHA detected - need proxy service"
                return product

            # Try to extract price using multiple patterns
            price_patterns = [
                r'\$[\d,]+\.\d{2}',  # $1,299.99
                r'"priceAmount":"([\d,]+\.?\d*)"',  # JSON data
                r'<span class="a-price-whole">([\d,]+)</span>',  # Whole price part
            ]

            price_found = False
            for pattern in price_patterns:
                matches = re.findall(pattern, html)
                if matches:
                    for match in matches:
                        try:
                            # Clean up the price string
                            price_str = match.replace(',', '').replace('$', '')
                            price = float(price_str)
                            # Sanity check - price should be reasonable
                            if 10 < price < 10000:
                                product.price = price
                                price_found = True
                                break
                        except ValueError:
                            continue
                    if price_found:
                        break

            # Extract title
            title_patterns = [
                r'<title>(.*?)</title>',
                r'<span id="productTitle"[^>]*>(.*?)</span>',
                r'"name":"(.*?)"',
            ]
            for pattern in title_patterns:
                match = re.search(pattern, html, re.DOTALL)
                if match:
                    product.title = match.group(1).strip()
                    # Clean up common Amazon title additions
                    product.title = re.sub(r'\s*-\s*Amazon\.com.*$', '', product.title)
                    break

            # Check availability
            availability_patterns = [
                r'In Stock',
                r'Only \d+ left',
                r'Available',
            ]
            for pattern in availability_patterns:
                if re.search(pattern, html, re.IGNORECASE):
                    product.in_stock = True
                    break

            # If price was found, assume in stock
            if product.price and not product.in_stock:
                product.in_stock = True

            if not price_found and not product.error:
                product.error = "Price not found - may be blocked"

        except requests.exceptions.RequestException as e:
            product.error = f"Request failed: {str(e)}"
        except Exception as e:
            product.error = f"Exception: {str(e)}"

        return product

    def scrape_ebay(self, sku: str, url: str) -> ScrapedProduct:
        """Scrape eBay using requests"""
        product = ScrapedProduct(sku=sku, retailer="ebay", url=url)

        try:
            import time
            time.sleep(2)

            response = self.session.get(url, timeout=10)

            if response.status_code >= 400:
                product.error = f"HTTP {response.status_code}"
                return product

            html = response.text

            # Extract price
            price_patterns = [
                r'\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?',  # $1,299.99
                r'US \$[\d,]+\.?\d*',  # US $1,299.99
                r'<span class="notranslate">\$?([\d,]+\.?\d*)</span>',
            ]

            for pattern in price_patterns:
                matches = re.findall(pattern, html)
                if matches:
                    for match in matches:
                        try:
                            price_str = match.replace(',', '').replace('$', '').replace('US ', '')
                            price = float(price_str)
                            if 10 < price < 10000:
                                product.price = price
                                break
                        except ValueError:
                            continue
                    if product.price:
                        break

            # Extract title
            title_patterns = [
                r'<h1[^>]*class="[^"]*x-item-title-label[^"]*"[^>]*>(.*?)</h1>',
                r'<h1 id="itemTitle"[^>]*>(.*?)</h1>',
                r'<title>(.*?)(?:\||-)\s*eBay',
            ]
            for pattern in title_patterns:
                match = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
                if match:
                    product.title = match.group(1).strip()
                    break

            # Check availability
            product.in_stock = bool(product.price)

        except Exception as e:
            product.error = f"Exception: {str(e)}"

        return product

    def scrape_product(self, sku: str, retailer: str, url: str) -> ScrapedProduct:
        """Route to appropriate scraper"""
        if retailer == "amazon":
            return self.scrape_amazon(sku, url)
        elif retailer == "ebay":
            return self.scrape_ebay(sku, url)
        else:
            return ScrapedProduct(
                sku=sku,
                retailer=retailer,
                error=f"Unknown retailer: {retailer}"
            )

async def run_simple_test():
    """Test the simple scraper"""
    print("="*60)
    print("TESTING SIMPLE SCRAPER")
    print("="*60)

    # Load product mappings
    with open('gpudrip-products.json', 'r') as f:
        gpudrip_products = json.load(f)

    # Test RTX 4090 on Amazon
    sku = 'rtx-4090'
    urls = gpudrip_products.get(sku, [])

    if not urls:
        print(f"ERROR: No URLs found for {sku}")
        return

    retailer_info = urls[0]
    retailer = retailer_info['retailer']
    url = retailer_info['url']

    print(f"\nProduct: {sku}")
    print(f"Retailer: {retailer}")
    print(f"URL: {url}")
    print("\nScraping...")

    scraper = SimpleScraper(use_proxy=False)
    result = scraper.scrape_product(sku, retailer, url)

    print("\n" + "-"*60)
    print("RESULTS:")
    print("-"*60)

    if result.error:
        print(f"❌ ERROR: {result.error}")
        print("\nNOTE: Amazon may be blocking direct requests.")
        print("Options:")
        print("  1. Use a proxy service (ScraperAPI, Bright Data)")
        print("  2. Use Amazon Product Advertising API (official)")
        print("  3. Use affiliate feeds (Amazon Associates API)")
    else:
        print(f"✅ SUCCESS!")
        print(f"   Title: {result.title if result.title else 'N/A'}")
        print(f"   Price: ${result.price}")
        print(f"   Stock: {result.in_stock}")
        print(f"   Condition: {result.condition}")

    print("\n" + "="*60)

    return result

if __name__ == "__main__":
    asyncio.run(run_simple_test())
