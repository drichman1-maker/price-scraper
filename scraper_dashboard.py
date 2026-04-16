#!/usr/bin/env python3
"""
Scraper Dashboard - Compare scraped prices vs dashboard prices
"""
import asyncio
import json
import os
import aiohttp
from datetime import datetime
from typing import List, Dict
import webbrowser
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import socketserver

# Import scraper components
from run_robust_scraper import run_robust_scraper, get_product_msrp, load_product_json
from robust_scraper import RobustScraper

# Configuration
BACKENDS = {
    "theresmac": "https://theresmac-backend.fly.dev",
    "gpudrip": "https://gpudrip-backend.fly.dev",
}

PORT = 8080
DASHBOARD_FILE = "scraper_results.json"

class ScraperDashboard:
    def __init__(self):
        self.results = {
            "last_run": None,
            "theresmac": {},
            "gpudrip": {}
        }

    async def get_dashboard_prices(self, project: str) -> Dict:
        """Fetch current prices from dashboard backend"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{BACKENDS[project]}/api/products"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        # Extract Amazon prices from backend data
                        dashboard_prices = {}
                        for product in data:
                            product_id = product.get("id", "")
                            if product_id and "prices" in product and "amazon" in product["prices"]:
                                amazon_data = product["prices"]["amazon"]
                                dashboard_prices[product_id] = {
                                    "price": amazon_data.get("price"),
                                    "in_stock": amazon_data.get("inStock", False),
                                    "verified": amazon_data.get("verified", False)
                                }
                        return dashboard_prices
        except Exception as e:
            print(f"Error fetching dashboard prices for {project}: {e}")
        return {}

    async def scrape_and_compare(self, project: str) -> Dict:
        """Scrape prices and compare with dashboard"""
        print(f"\n🔍 Scraping {project}...")

        # Get current dashboard prices
        dashboard_prices = await self.get_dashboard_prices(project)
        print(f"   Dashboard: {len(dashboard_prices)} products")

        # Run scraper
        scraper = RobustScraper()
        products = load_product_json(project)
        scraped_data = {}

        for sku, configs in products.items():
            query = sku.replace('-', ' ')
            result = scraper.search_amazon(query)

            scraped_data[sku] = {
                "scraped_price": result.price,
                "in_stock": result.in_stock,
                "title": result.title,
                "error": result.error,
                "msrp": get_product_msrp(project, sku)
            }

        # Compare
        comparison = {}
        for sku, scraped in scraped_data.items():
            dashboard = dashboard_prices.get(sku, {})

            comparison[sku] = {
                "dashboard_price": dashboard.get("price"),
                "scraped_price": scraped["scraped_price"],
                "in_stock": scraped["in_stock"],
                "msrp": scraped["msrp"],
                "price_difference": None,
                "percent_change": None,
                "needs_update": False,
                "is_deal": False,
                "title": scraped["title"],
                "error": scraped["error"]
            }

            if scraped["scraped_price"] and dashboard.get("price"):
                diff = scraped["scraped_price"] - dashboard["price"]
                percent = (diff / dashboard["price"]) * 100 if dashboard["price"] > 0 else 0

                comparison[sku]["price_difference"] = diff
                comparison[sku]["percent_change"] = percent
                comparison[sku]["needs_update"] = abs(diff) > 5  # Update if difference > $5

                if scraped["msrp"]:
                    discount = scraped["msrp"] - scraped["scraped_price"]
                    comparison[sku]["is_deal"] = discount > 0 and (discount / scraped["msrp"]) > 0.05  # 5%+ off MSRP

        self.results[project] = comparison
        self.results["last_run"] = datetime.now().isoformat()

        # Save results
        with open(DASHBOARD_FILE, 'w') as f:
            json.dump(self.results, f, indent=2)

        return comparison

    def generate_html_report(self) -> str:
        """Generate HTML dashboard report"""
        if not self.results.get("last_run"):
            return "<h1>No data available. Run scraper first.</h1>"

        last_run = self.results["last_run"]
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>Scraper Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .last-run { color: #888; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #4CAF50; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f9f9f9; }
        .deal { background: #d4edda !important; }
        .update { background: #fff3cd !important; }
        .price-up { color: red; }
        .price-down { color: green; }
        .no-change { color: #888; }
        .in-stock { color: green; font-weight: bold; }
        .out-of-stock { color: red; font-weight: bold; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { flex: 1; background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .stat-label { color: #666; font-size: 14px; }
        .refresh-btn { background: #4CAF50; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px; font-size: 16px; }
        .refresh-btn:hover { background: #45a049; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Scraper Dashboard</h1>
        <div class="last-run">Last run: """ + last_run + """</div>
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
"""

        # Generate summary stats
        total_products = 0
        deals_found = 0
        needs_update = 0
        in_stock = 0

        for project in ["theresmac", "gpudrip"]:
            if project in self.results:
                for sku, data in self.results[project].items():
                    total_products += 1
                    if data.get("is_deal"):
                        deals_found += 1
                    if data.get("needs_update"):
                        needs_update += 1
                    if data.get("in_stock"):
                        in_stock += 1

        html += f"""
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">{total_products}</div>
                <div class="stat-label">Total Products</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{deals_found}</div>
                <div class="stat-label">🎉 Deals Found</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{needs_update}</div>
                <div class="stat-label">⚠️ Needs Update</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{in_stock}</div>
                <div class="stat-label">✅ In Stock</div>
            </div>
        </div>
"""

        # Generate tables for each project
        for project in ["theresmac", "gpudrip"]:
            if project in self.results and self.results[project]:
                html += f"<h2>{project.upper()}</h2>"
                html += "<table><thead><tr>"
                html += "<th>SKU</th><th>Dashboard Price</th><th>Scraped Price</th><th>MSRP</th>"
                html += "<th>Change</th><th>Stock</th><th>Status</th></tr></thead><tbody>"

                for sku, data in self.results[project].items():
                    row_class = ""
                    if data.get("is_deal"):
                        row_class = "deal"
                    elif data.get("needs_update"):
                        row_class = "update"

                    change_html = "-"
                    if data.get("price_difference") is not None:
                        diff = data["price_difference"]
                        percent = data.get("percent_change", 0)
                        if abs(diff) < 0.01:
                            change_html = '<span class="no-change">No change</span>'
                        elif diff > 0:
                            change_html = f'<span class="price-up">+${diff:.2f} ({percent:.1f}%)</span>'
                        else:
                            change_html = f'<span class="price-down">-${abs(diff):.2f} ({percent:.1f}%)</span>'

                    stock_html = f'<span class="in-stock">✅ In Stock</span>' if data.get("in_stock") else '<span class="out-of-stock">❌ Out of Stock</span>'

                    status_badges = []
                    if data.get("is_deal"):
                        status_badges.append("🎉 DEAL")
                    if data.get("needs_update"):
                        status_badges.append("⚠️ UPDATE")
                    status_html = " ".join(status_badges) if status_badges else "-"

                    dashboard_price = f"${data.get('dashboard_price', 0):.2f}" if data.get('dashboard_price') else "N/A"
                    scraped_price = f"${data.get('scraped_price', 0):.2f}" if data.get('scraped_price') else "N/A"
                    msrp_price = f"${data.get('msrp', 0):.2f}" if data.get('msrp') else "N/A"

                    html += f'<tr class="{row_class}">'
                    html += f'<td>{sku}</td>'
                    html += f'<td>{dashboard_price}</td>'
                    html += f'<td>{scraped_price}</td>'
                    html += f'<td>{msrp_price}</td>'
                    html += f'<td>{change_html}</td>'
                    html += f'<td>{stock_html}</td>'
                    html += f'<td>{status_html}</td>'
                    html += '</tr>'

                html += "</tbody></table>"

        html += """
    </div>
</body>
</html>
"""
        return html

async def main():
    """Main dashboard runner"""
    print("🚀 Starting Scraper Dashboard...")

    dashboard = ScraperDashboard()

    # Scrape both sites
    print("\n📊 Scraping TheresMac...")
    await dashboard.scrape_and_compare("theresmac")

    print("\n📊 Scraping GPU Drip...")
    await dashboard.scrape_and_compare("gpudrip")

    # Generate HTML report
    html_content = dashboard.generate_html_report()

    # Save HTML
    html_file = "scraper_dashboard.html"
    with open(html_file, 'w') as f:
        f.write(html_content)

    print(f"\n✅ Dashboard generated: {html_file}")

    # Start web server
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=os.getcwd(), **kwargs)

    def start_server():
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"\n🌐 Dashboard running at: http://localhost:{PORT}")
            print(f"   View at: file://{os.path.abspath(html_file)}")
            httpd.serve_forever()

    # Open in browser
    webbrowser.open(f'file://{os.path.abspath(html_file)}')

    # Start server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    print("\nPress Ctrl+C to stop the dashboard server...")

    try:
        # Keep running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Dashboard stopped.")

if __name__ == "__main__":
    asyncio.run(main())
