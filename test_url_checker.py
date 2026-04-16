#!/usr/bin/env python3
"""Quick test of URL checker - checks first 5 URLs only"""

import asyncio
import aiohttp

async def check_one(url):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10, allow_redirects=True) as resp:
                return {
                    "url": url,
                    "status": resp.status,
                    "final": str(resp.url),
                    "ok": resp.status == 200
                }
    except Exception as e:
        return {"url": url, "status": "error", "final": str(e), "ok": False}

async def main():
    # Test URLs from GPU Drip backend
    url = "https://gpudrip-backend-icy-night-2201.fly.dev/api/gpus"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            data = await resp.json()
            
    # Get first product with Amazon URL
    for p in data:
        retailers = p.get("retailers", {})
        amazon = retailers.get("amazon", {})
        if amazon and amazon.get("url"):
            print(f"Testing: {p.get('model')}")
            print(f"URL: {amazon['url']}")
            
            result = await check_one(amazon["url"])
            print(f"Status: {result['status']}")
            print(f"Final URL: {result['final']}")
            print(f"OK: {result['ok']}")
            break

asyncio.run(main())
