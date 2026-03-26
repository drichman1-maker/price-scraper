"""
API Client for updating backend prices
"""
import asyncio
import os
from typing import Dict, List, Optional
from dataclasses import asdict
import aiohttp

from config import BACKENDS, API_KEYS
from scraper_engine import ScrapedProduct


class BackendAPIClient:
    def __init__(self, project: str):  # "theresmac" or "gpudrip"
        self.project = project
        self.base_url = BACKENDS[project].rstrip("/")
        self.api_key = API_KEYS[project]
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def update_price(self, product: ScrapedProduct) -> Dict:
        """Update price for a single product"""
        if product.error:
            return {
                "success": False,
                "sku": product.sku,
                "error": product.error
            }
        
        if not product.price:
            return {
                "success": False,
                "sku": product.sku,
                "error": "No price extracted"
            }
        
        # Build endpoint URL (using /price endpoint added to backends)
        endpoint = f"{self.base_url}/api/products/{product.sku}/price"
        
        payload = {
            "retailer": product.retailer,
            "price": product.price,
            "currency": product.currency,
            "in_stock": product.in_stock,
            "condition": product.condition,
            "url": product.url,
            "scraped_at": asyncio.get_event_loop().time(),
        }
        
        try:
            async with self.session.post(endpoint, json=payload) as resp:
                if resp.status in [200, 201, 204]:
                    return {
                        "success": True,
                        "sku": product.sku,
                        "retailer": product.retailer,
                        "price": product.price
                    }
                else:
                    text = await resp.text()
                    return {
                        "success": False,
                        "sku": product.sku,
                        "status": resp.status,
                        "error": text[:200]
                    }
        except Exception as e:
            return {
                "success": False,
                "sku": product.sku,
                "error": str(e)
            }
    
    async def update_prices_batch(self, products: List[ScrapedProduct]) -> List[Dict]:
        """Update multiple prices in parallel"""
        semaphore = asyncio.Semaphore(5)  # Max 5 concurrent API calls
        
        async def update_with_limit(product: ScrapedProduct) -> Dict:
            async with semaphore:
                return await self.update_price(product)
        
        results = await asyncio.gather(*[
            update_with_limit(p) for p in products
        ])
        
        return list(results)
    
    async def get_products(self) -> List[Dict]:
        """Get list of products to scrape from backend"""
        endpoint = f"{self.base_url}/api/products"
        
        try:
            async with self.session.get(endpoint) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("products", data)
                else:
                    return []
        except Exception as e:
            print(f"Error fetching products: {e}")
            return []