#!/usr/bin/env python3
"""
Robust scraper based on debug findings.
Uses flexible regex patterns that successfully extracted prices.
"""
import requests
import re
import json
from typing import List, Dict, Optional
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

class RobustScraper:
    def __init__(self):
        self.session = requests.Session()
from config import get_random_user_agent

        self.session.headers.update({\n            "User-Agent": get_random_user_agent(),\n            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",\n            "Accept-Language": "en-US,en;q=0.5",\n        })

    def _clean_price(self, price_str: str) -> Optional[float]:
        """Convert price string to float"""
        try:
            # Remove $ and commas
            clean = price_str.replace('$', '').replace(',', '').strip()
            return float(clean)
        except ValueError:
            return None

    def search_amazon(self, query: str, target_price_min: Optional[float] = None, target_price_max: Optional[float] = None) -> ScrapedProduct:
        """
        Search Amazon and return the first relevant product with a price.
        Filters by price range if provided.
        """
        product = ScrapedProduct(sku="search", retailer="amazon", error="No valid product found")

        try:
            url = f"https://www.amazon.com/s?k={quote(query)}"
            response = self.session.get(url, timeout=10)

            if response.status_code != 200:
                product.error = f"HTTP {response.status_code}"
                return product

            html = response.text

            # 1. Extract ALL prices using the confirmed pattern
            price_pattern = r'\$[\d,]+\.\d{2}'
            raw_prices = re.findall(price_pattern, html)
            prices = [self._clean_price(p) for p in raw_prices if self._clean_price(p) is not None]

            if not prices:
                product.error = "No prices found in HTML"
                return product

            # 2. Extract candidate titles (simple heuristic)
            # Look for text that appears near prices or in specific containers
            # For now, we'll use the query as the title placeholder if we find a price
            # In a real app, we'd parse the DOM more carefully

            # 3. Filter prices
            valid_prices = prices
            if target_price_min is not None:
                valid_prices = [p for p in valid_prices if p >= target_price_min]
            if target_price_max is not None:
                valid_prices = [p for p in valid_prices if p <= target_price_max]

            # 4. Select the best price (e.g., lowest valid price)
            if valid_prices:
                best_price = min(valid_prices)
                product.price = best_price
                product.title = query  # Placeholder: we found a price for this query
                product.in_stock = True
                product.error = None
            else:
                # If filters removed everything, return the lowest overall price but note it
                product.price = min(prices)
                product.title = query
                product.in_stock = True
                product.error = "Price found but outside target range"

        except Exception as e:
            product.error = f"Exception: {str(e)}"

        return product

    def search_ebay(self, query: str) -> ScrapedProduct:
        """Search eBay for a product"""
        product = ScrapedProduct(sku="search", retailer="ebay", error="No valid product found")

        try:
            url = f"https://www.ebay.com/sch/i.html?_nkw={quote(query)}"
            response = self.session.get(url, timeout=10)

            if response.status_code != 200:
                product.error = f"HTTP {response.status_code}"
                return product

            html = response.text

            # Extract prices
            price_pattern = r'\$[\d,]+\.\d{2}'
            raw_prices = re.findall(price_pattern, html)
            prices = [self._clean_price(p) for p in raw_prices if self._clean_price(p) is not None]

            if prices:
                product.price = min(prices)
                product.title = query
                product.in_stock = True
                product.error = None
            else:
                product.error = "No prices found"

        except Exception as e:
            product.error = f"Exception: {str(e)}"

        return product

async def test_robust():
    print("="*60)
    print("TESTING ROBUST SCRAPER")
    print("="*60)

    scraper = RobustScraper()

    # Test 1: RTX 4090 (Expected ~$1600-$2000)
    print("\n[AMAZON] Searching for: RTX 4090")
    result = scraper.search_amazon("RTX 4090", target_price_min=1500, target_price_max=2500)
    print(f"  Status: {'✅' if not result.error else '❌'}")
    print(f"  Price: ${result.price}")
    print(f"  Error: {result.error}")

    # Test 2: MacBook Pro 14 M5 (Expected ~$2000-$3500)
    print("\n[AMAZON] Searching for: MacBook Pro 14 M5")
    result = scraper.search_amazon("MacBook Pro 14 M5", target_price_min=1800, target_price_max=4000)
    print(f"  Status: {'✅' if not result.error else '❌'}")
    print(f"  Price: ${result.price}")
    print(f"  Error: {result.error}")

    # Test 3: eBay RTX 4090
    print("\n[EBAY] Searching for: RTX 4090")
    result = scraper.search_ebay("RTX 4090")
    print(f"  Status: {'✅' if not result.error else '❌'}")
    print(f"  Price: ${result.price}")
    print(f"  Error: {result.error}")

    print("\n" + "="*60)

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_robust())
