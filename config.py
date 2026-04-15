"""
Scraper configuration for TheresMac and GPU Drip
"""
import os
from dataclasses import dataclass
from typing import List, Dict, Optional

@dataclass
class RetailerConfig:
    name: str
    base_url: str
    affiliate_id: str
    selectors: Dict[str, str]
    headers: Dict[str, str]
    use_proxy: bool = False

# Backend API endpoints
BACKENDS = {
    "theresmac": os.getenv("THERESMAC_API_URL", "https://theresmac-backend.fly.dev"),
    "gpudrip": os.getenv("GPUDRIP_API_URL", "https://gpudrip-backend.fly.dev"),
}

API_KEYS = {
    "theresmac": os.getenv("THERESMAC_API_KEY"),
    "gpudrip": os.getenv("GPUDRIP_API_KEY"),
}

# Retailer configurations
RETAILERS = {
    "amazon": RetailerConfig(
        name="Amazon",
        base_url="https://www.amazon.com",
        affiliate_id=os.getenv("AMAZON_AFFILIATE_ID", "Theresmac-20"),
        selectors={
            "price_whole": "span.a-price-whole",
            "price_fraction": "span.a-price-fraction",
            "price_symbol": "span.a-price-symbol",
            "title": "#productTitle",
            "availability": "#availability span",
            "condition": "#newAccordionRow .a-color-success",  # New condition badge
        },
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
        },
    ),
    "ebay": RetailerConfig(
        name="eBay",
        base_url="https://www.ebay.com",
        affiliate_id=os.getenv("EBAY_AFFILIATE_ID", "5339142921"),
        selectors={
            "price": "span.notranslate",  # Price container
            "price_alt": "div.x-price-primary span.ux-textspans",
            "title": "h1.x-item-title-label",
            "title_alt": "#itemTitle",
            "availability": "div.x-availability-status",
            "availability_alt": "#qtySubTxt",
            "condition": "span.ux-textspans.ux-textspans--SECONDARY-SUBHEAD",
            "condition_alt": "#vi-itm-cond",
        },
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        },
    ),
}

# Product mapping: SKU -> List of (retailer, product_url) tuples
ProductMapping = Dict[str, List[tuple]]

# Default rate limiting
RATE_LIMIT = {
    "requests_per_second": 0.5,  # 1 request every 2 seconds
    "max_retries": 3,
    "retry_delay_base": 2,  # seconds
    "retry_delay_max": 30,  # seconds
}

import random

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/121.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
]

def get_random_user_agent() -> str:
    return random.choice(USER_AGENTS)

# ScraperAPI configuration (optional)
SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY")
SCRAPER_API_URL = "http://api.scraperapi.com"

def get_scraperapi_url(target_url: str, premium: bool = False) -> str:
    """Get ScraperAPI URL with authentication"""
    if not SCRAPER_API_KEY:
        return target_url
    
    params = f"api_key={SCRAPER_API_KEY}&url={target_url}"
    if premium:
        params += "&premium=true"
    
    return f"{SCRAPER_API_URL}?{params}"