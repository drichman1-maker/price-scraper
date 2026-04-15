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
        """Alert on prices - NO backend update"""
        print("\n" + "="*60)
        print("📊 PRICE & STOCK ALERTS")
        print("="*60)

        results = []
        for product in products:
            if product.error:
                print(f"❌ {product.sku} ({product.retailer}): {product.error}")
                results.append({"success": False, "sku": product.sku, "error": product.error})
            elif not product.price:
                print(f"⚠️ {product.sku} ({product.retailer}): No price found")
                results.append({"success": False, "sku": product.sku, "error": "No price"})
            else:
                stock_status = "✅ IN STOCK" if product.in_stock else "❌ OUT OF STOCK"
                print(f"💰 {product.sku} ({product.retailer})")
                print(f"   Price: ${product.price:.2f}")

                # Calculate discount if MSRP is available
                if product.msrp:
                    discount = product.msrp - product.price
                    discount_percent = (discount / product.msrp) * 100 if product.msrp > 0 else 0
                    if discount > 0:
                        print(f"   MSRP: ${product.msrp:.2f} | 🎉 SAVE ${discount:.2f} ({discount_percent:.1f}% off)")
                    elif discount < 0:
                        premium = -discount
                        print(f"   MSRP: ${product.msrp:.2f} | ⚠️ PREMIUM ${premium:.2f} ({-discount_percent:.1f}% above MSRP)")
                    else:
                        print(f"   MSRP: ${product.msrp:.2f} | ✅ At MSRP")

                print(f"   Status: {stock_status}")
                if product.title:
                    print(f"   Title: {product.title[:80]}")
                print()
                results.append({
                    "success": True,
                    "sku": product.sku,
                    "retailer": product.retailer,
                    "price": product.price,
                    "in_stock": product.in_stock,
                    "msrp": product.msrp
                })

        in_stock_count = sum(1 for r in results if r.get("success") and r.get("in_stock"))
        print("="*60)
        print(f"✅ {len(results)} total products | {in_stock_count} in stock")
        print("="*60 + "\n")

        return results
    
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