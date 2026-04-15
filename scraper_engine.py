"""
Core scraper engine with Playwright
"""
import asyncio
import json
import random
import time
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass
from playwright.async_api import async_playwright, Page
from playwright.async_api import TimeoutError as PlaywrightTimeout

from config import RETAILERS, RATE_LIMIT, get_scraperapi_url


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
    raw_data: Optional[Dict] = None
    msrp: Optional[float] = None  # Added MSRP field


class ScraperEngine:
    def __init__(self, use_proxy: bool = False):
        self.use_proxy = use_proxy
        self.playwright = None
        self.browser = None
        self._last_request_time = 0
        
    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        
        # Launch browser with stealth options
        browser_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
        ]
        
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=browser_args,
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def _create_page(self, retailer: str) -> Page:
        """Create a new page with retailer-specific context"""
        config = RETAILERS[retailer]
        
from config import get_random_user_agent

context = await self.browser.new_context(
    viewport={"width": 1920, "height": 1080},
    user_agent=get_random_user_agent(),
            locale="en-US",
            timezone_id="America/New_York",
        )
        
        # Add stealth scripts
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            window.chrome = { runtime: {} };
        """)
        
        page = await context.new_page()
        
        # Set extra headers
        await page.set_extra_http_headers(config.headers)
        
        return page
    
    async def _rate_limit(self):
        """Apply rate limiting between requests"""
        min_delay = 1.0 / RATE_LIMIT["requests_per_second"]
        elapsed = time.time() - self._last_request_time
        if elapsed < min_delay:
            await asyncio.sleep(min_delay - elapsed + random.uniform(0.5, 1.5))
        self._last_request_time = time.time()
    
    async def scrape_amazon(self, sku: str, url: str) -> ScrapedProduct:
        """Scrape Amazon product page"""
        config = RETAILERS["amazon"]
        product = ScrapedProduct(sku=sku, retailer="amazon", url=url)
        
        try:
            await self._rate_limit()
            
            page = await self._create_page("amazon")
            
            # Use ScraperAPI if available, else direct
            target_url = get_scraperapi_url(url) if self.use_proxy else url
            
            response = await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            
            if response.status >= 400:
                product.error = f"HTTP {response.status}"
                await page.close()
                return product
            
            # Wait for price element - try multiple selectors
            price_found = False
            price_selector = None
            
            for selector in [".a-price .a-offscreen", config.selectors["price_whole"], ".a-price-to-pay .a-offscreen", "#priceblock_dealprice", "#priceblock_ourprice"]:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    price_elem = await page.query_selector(selector)
                    if price_elem:
                        price_text = await price_elem.text_content()
                        if price_text and '$' in price_text:
                            price_selector = selector
                            price_found = True
                            break
                except:
                    continue
            
            if not price_found:
                # Try alternative selectors or captcha detection
                if await page.query_selector("input[name='password']"):
                    product.error = "CAPTCHA detected"
                elif await page.query_selector("#captchacharacters"):
                    product.error = "CAPTCHA detected"
                elif await page.query_selector("text=Robot Check"):
                    product.error = "Robot check detected"
                else:
                    product.error = "Price not found (timeout)"
                await page.close()
                return product
            
            # Extract price using the working selector
            price_text = await page.text_content(price_selector)
            
            if price_text:
                # Parse price like "$999.00" or "$1,299.99"
                import re
                price_match = re.search(r'\$([\d,]+\.?\d*)', price_text.strip())
                if price_match:
                    try:
                        product.price = float(price_match.group(1).replace(',', ''))
                    except ValueError:
                        product.error = f"Price parse error: {price_text}"
                else:
                    product.error = f"Price regex failed: {price_text}"
            
            # Extract title
            try:
                product.title = await page.text_content(config.selectors["title"])
                if product.title:
                    product.title = product.title.strip()
            except:
                pass
            
            # Extract availability
            try:
                avail_text = await page.text_content(config.selectors["availability"])
                product.in_stock = avail_text and "in stock" in avail_text.lower()
            except:
                product.in_stock = bool(product.price)  # Assume in stock if price shown
            
            # Extract condition (look for "New" indicator)
            try:
                condition_text = await page.text_content(config.selectors["condition"])
                product.condition = condition_text.strip() if condition_text else "New"
            except:
                product.condition = "New"  # Default assumption
            
            await page.close()
            
        except Exception as e:
            product.error = f"Exception: {str(e)}"
        
        return product
    
    async def scrape_ebay(self, sku: str, url: str) -> ScrapedProduct:
        """Scrape eBay product page"""
        config = RETAILERS["ebay"]
        product = ScrapedProduct(sku=sku, retailer="ebay", url=url)
        
        try:
            await self._rate_limit()
            
            page = await self._create_page("ebay")
            target_url = get_scraperapi_url(url) if self.use_proxy else url
            
            response = await page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            
            if response.status >= 400:
                product.error = f"HTTP {response.status}"
                await page.close()
                return product
            
            # Wait for content
            await asyncio.sleep(2)  # eBay loads dynamically
            
            # Try to extract price
            price_selectors = [config.selectors["price"], config.selectors["price_alt"]]
            for selector in price_selectors:
                try:
                    price_elem = await page.query_selector(selector)
                    if price_elem:
                        price_text = await price_elem.text_content()
                        if price_text:
                            # Parse price from text like "$999.99" or "US $999.99"
                            import re
                            price_match = re.search(r'[\$£€]([\d,]+\.?\d*)', price_text)
                            if price_match:
                                product.price = float(price_match.group(1).replace(',', ''))
                                break
                except:
                    continue
            
            # Extract title
            title_selectors = [config.selectors["title"], config.selectors["title_alt"]]
            for selector in title_selectors:
                try:
                    product.title = await page.text_content(selector)
                    if product.title:
                        product.title = product.title.replace("Details about  ", "").strip()
                        break
                except:
                    continue
            
            # Extract availability
            avail_selectors = [config.selectors["availability"], config.selectors["availability_alt"]]
            for selector in avail_selectors:
                try:
                    avail_text = await page.text_content(selector)
                    if avail_text:
                        product.in_stock = any(x in avail_text.lower() for x in ["available", "in stock", "left"])
                        break
                except:
                    continue
            
            if not any([product.in_stock, product.error]):
                product.in_stock = bool(product.price)
            
            # Extract condition
            cond_selectors = [config.selectors["condition"], config.selectors["condition_alt"]]
            for selector in cond_selectors:
                try:
                    product.condition = await page.text_content(selector)
                    if product.condition:
                        product.condition = product.condition.strip()
                        break
                except:
                    continue
            
            await page.close()
            
        except Exception as e:
            product.error = f"Exception: {str(e)}"
        
        return product
    
    async def scrape_product(self, sku: str, retailer: str, url: str) -> ScrapedProduct:
        """Route to appropriate scraper"""
        if retailer == "amazon":
            return await self.scrape_amazon(sku, url)
        elif retailer == "ebay":
            return await self.scrape_ebay(sku, url)
        else:
            return ScrapedProduct(
                sku=sku,
                retailer=retailer,
                error=f"Unknown retailer: {retailer}"
            )