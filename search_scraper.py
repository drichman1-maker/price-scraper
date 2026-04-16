#!/usr/bin/env python3
"""
Price scraper using search results (more reliable than direct product pages)
This approach scrapes search results which are less likely to be blocked
"""
import requests
import re
import json
import asyncio
from typing import Dict, Optional, List
from dataclasses import dataclass
from urllib.parse import quote

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

class SearchScraper:
    """Scraper that works with search results"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        })

    def search_amazon(self, search_query: str, max_results: int = 3) -> List[Dict]:
        """Search Amazon and return product results"""
        results = []

        try:
            # Build search URL
            encoded_query = quote(search_query)
            search_url = f"https://www.amazon.com/s?k={encoded_query}"

            response = self.session.get(search_url, timeout=10)

            if response.status_code != 200:
                return [{"error": f"HTTP {response.status_code}"}]

            html = response.text

            # Extract product cards using patterns
            # Look for price and title in search results
            product_blocks = re.findall(r'<div[^>]*data-component-type="s-search-result"[^>]*>.*?</div>\s*(?:<div[^>]*data-component-type="s-search-result"|$)', html, re.DOTALL)

            for block in product_blocks[:max_results]:
                product = {}

                # Extract title
                title_match = re.search(r'<h2[^>]*class="[^"]*a-size-mini[^"]*"[^>]*>.*?<span[^>]*class="[^"]*a-size-base[^"]*"[^>]*>(.*?)</span>', block, re.DOTALL)
                if title_match:
                    product['title'] = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()

                # Extract price (whole + fraction)
                price_whole = re.search(r'<span class="a-price-whole">([\d,]+)</span>', block)
                price_fraction = re.search(r'<span class="a-price-fraction">(\d{2})</span>', block)

                if price_whole:
                    price_str = price_whole.group(1).replace(',', '')
                    if price_fraction:
                        price_str += '.' + price_fraction.group(1)
                    try:
                        product['price'] = float(price_str)
                    except ValueError:
                        pass

                # Extract link
                link_match = re.search(r'<a[^>]*class="[^"]*a-link-normal[^"]*"[^>]*href="([^"]+)"', block)
                if link_match:
                    product['url'] = "https://www.amazon.com" + link_match.group(1).split('?')[0]

                if product.get('title') and product.get('price'):
                    results.append(product)

        except Exception as e:
            return [{"error": f"Exception: {str(e)}"}]

        return results

    def search_ebay(self, search_query: str, max_results: int = 3) -> List[Dict]:
        """Search eBay and return product results"""
        results = []

        try:
            encoded_query = quote(search_query)
            search_url = f"https://www.ebay.com/sch/i.html?_nkw={encoded_query}"

            response = self.session.get(search_url, timeout=10)

            if response.status_code != 200:
                return [{"error": f"HTTP {response.status_code}"}]

            html = response.text

            # eBay uses specific classes for items
            item_pattern = r'<li[^>]*class="[^"]*s-item[^"]*"[^>]*>.*?</li>'
            items = re.findall(item_pattern, html, re.DOTALL)

            for item in items[:max_results]:
                product = {}

                # Extract title
                title_match = re.search(r'<div[^>]*class="[^"]*s-item__title[^"]*"[^>]*>.*?<span[^>]*role="heading">([^<]+)</span>', item, re.DOTALL)
                if title_match:
                    product['title'] = title_match.group(1).strip()

                # Extract price
                price_match = re.search(r'<span[^>]*class="[^"]*s-item__price[^"]*"[^>]*>([^<]+)</span>', item)
                if price_match:
                    price_text = price_match.group(1).replace('$', '').replace(',', '').strip()
                    try:
                        product['price'] = float(price_text)
                    except ValueError:
                        pass

                # Extract link
                link_match = re.search(r'<a[^>]*class="[^"]*s-item__link[^"]*"[^>]*href="([^"]+)"', item)
                if link_match:
                    product['url'] = link_match.group(1)

                if product.get('title') and product.get('price'):
                    results.append(product)

        except Exception as e:
            return [{"error": f"Exception: {str(e)}"}]

        return results

async def test_search_scraper():
    """Test the search scraper"""
    print("="*60)
    print("TESTING SEARCH SCRAPER")
    print("="*60)

    scraper = SearchScraper()

    # Test Amazon search for RTX 4090
    print("\n[AMAZON] Searching for: RTX 4090")
    print("-"*60)
    amazon_results = scraper.search_amazon("RTX 4090 24GB", max_results=3)

    if amazon_results and not amazon_results[0].get('error'):
        for i, result in enumerate(amazon_results, 1):
            print(f"\nResult {i}:")
            print(f"  Title: {result.get('title', 'N/A')}")
            print(f"  Price: ${result.get('price', 'N/A')}")
            print(f"  URL: {result.get('url', 'N/A')[:60]}...")
    else:
        error_msg = amazon_results[0].get('error', 'No results') if amazon_results else 'No results'
        print(f"❌ Error: {error_msg}")

    # Test eBay search for RTX 4090
    print("\n\n[EBAY] Searching for: RTX 4090")
    print("-"*60)
    ebay_results = scraper.search_ebay("RTX 4090 24GB", max_results=3)

    if ebay_results and not ebay_results[0].get('error'):
        for i, result in enumerate(ebay_results, 1):
            print(f"\nResult {i}:")
            print(f"  Title: {result.get('title', 'N/A')}")
            print(f"  Price: ${result.get('price', 'N/A')}")
            print(f"  URL: {result.get('url', 'N/A')[:60]}...")
    else:
        error_msg = ebay_results[0].get('error', 'No results') if ebay_results else 'No results'
        print(f"❌ Error: {error_msg}")

    # Test Amazon search for MacBook
    print("\n\n[AMAZON] Searching for: MacBook Pro 14 M5")
    print("-"*60)
    mac_results = scraper.search_amazon("MacBook Pro 14 M5 Space Black", max_results=3)

    if mac_results and not mac_results[0].get('error'):
        for i, result in enumerate(mac_results, 1):
            print(f"\nResult {i}:")
            print(f"  Title: {result.get('title', 'N/A')}")
            print(f"  Price: ${result.get('price', 'N/A')}")
    else:
        error_msg = mac_results[0].get('error', 'No results') if mac_results else 'No results'
        print(f"❌ Error: {error_msg}")

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Amazon (RTX 4090): {'✅ Working' if amazon_results and 'error' not in amazon_results[0] else '❌ Failed'}")
    print(f"eBay (RTX 4090): {'✅ Working' if ebay_results and 'error' not in ebay_results[0] else '❌ Failed'}")
    print(f"Amazon (MacBook): {'✅ Working' if mac_results and 'error' not in mac_results[0] else '❌ Failed'}")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(test_search_scraper())
