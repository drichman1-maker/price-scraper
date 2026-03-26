"""
Main scraper runner - fetches products, scrapes prices, updates backend
"""
import asyncio
import json
import os
import sys
from datetime import datetime
from typing import List, Dict

from scraper_engine import ScraperEngine, ScrapedProduct
from api_client import BackendAPIClient

# Product URL mappings: sku -> list of (retailer, url)
THERESMAC_PRODUCTS = {
    # Example format - will be populated from JSON files or API
    "macbook-air-15-m3-2024": [
        ("amazon", "https://www.amazon.com/dp/B0CX23V2ZK"),
        ("ebay", "https://www.ebay.com/itm/123456789"),
    ],
}

GPUDRIP_PRODUCTS = {
    # Example format
    "rtx-4090": [
        ("amazon", "https://www.amazon.com/dp/B0BGJQ4TZP"),
        ("ebay", "https://www.ebay.com/itm/987654321"),
    ],
}


def load_product_mappings(project: str) -> Dict[str, List[tuple]]:
    """Load product mappings from JSON file or environment"""
    env_var = f"{project.upper()}_PRODUCTS_JSON"
    json_str = os.getenv(env_var)
    
    if json_str:
        try:
            data = json.loads(json_str)
            # Convert to list of tuples format
            result = {}
            for sku, urls in data.items():
                result[sku] = [(u["retailer"], u["url"]) for u in urls]
            return result
        except json.JSONDecodeError as e:
            print(f"Error parsing {env_var}: {e}")
    
    # Fallback to hardcoded (development) or return empty
    if project == "theresmac":
        return THERESMAC_PRODUCTS
    elif project == "gpudrip":
        return GPUDRIP_PRODUCTS
    
    return {}


async def run_scraper(project: str, use_proxy: bool = False) -> Dict:
    """Main scraper run for a project"""
    print(f"\n{'='*60}")
    print(f"Starting scraper for: {project.upper()}")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"Use proxy: {use_proxy}")
    print(f"{'='*60}\n")
    
    # Load product mappings
    products = load_product_mappings(project)
    
    if not products:
        print(f"ERROR: No products configured for {project}")
        print(f"Set {project.upper()}_PRODUCTS_JSON environment variable")
        return {"success": False, "error": "No products configured"}
    
    print(f"Loaded {len(products)} products")
    
    results = {
        "project": project,
        "started": datetime.now().isoformat(),
        "total_products": 0,
        "total_urls": 0,
        "successful": 0,
        "failed": 0,
        "errors": [],
        "updates": []
    }
    
    async with ScraperEngine(use_proxy=use_proxy) as engine:
        async with BackendAPIClient(project) as api:
            
            scraped_products: List[ScrapedProduct] = []
            
            # Scrape all products
            for sku, urls in products.items():
                print(f"\nScraping {sku}...")
                results["total_products"] += 1
                
                for retailer, url in urls:
                    results["total_urls"] += 1
                    print(f"  [{retailer}] {url[:60]}...")
                    
                    product = await engine.scrape_product(sku, retailer, url)
                    scraped_products.append(product)
                    
                    if product.error:
                        print(f"    ❌ ERROR: {product.error}")
                        results["errors"].append({
                            "sku": sku,
                            "retailer": retailer,
                            "error": product.error
                        })
                        results["failed"] += 1
                    else:
                        print(f"    ✓ ${product.price} | Stock: {product.in_stock} | Condition: {product.condition}")
                        results["successful"] += 1
            
            # Update backend
            print(f"\n\nUpdating {project} backend...")
            update_results = await api.update_prices_batch(scraped_products)
            
            success_count = sum(1 for r in update_results if r.get("success"))
            fail_count = len(update_results) - success_count
            
            print(f"  API updates: {success_count} success, {fail_count} failed")
            results["api_updates_success"] = success_count
            results["api_updates_failed"] = fail_count
            
            # Log failures
            for r in update_results:
                if not r.get("success"):
                    results["errors"].append(r)
    
    results["finished"] = datetime.now().isoformat()
    results["duration_seconds"] = (
        datetime.fromisoformat(results["finished"]) - 
        datetime.fromisoformat(results["started"])
    ).total_seconds()
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"SCRAPER SUMMARY - {project.upper()}")
    print(f"{'='*60}")
    print(f"Products: {results['total_products']}")
    print(f"URLs scraped: {results['total_urls']}")
    print(f"Successful scrapes: {results['successful']}")
    print(f"Failed scrapes: {results['failed']}")
    print(f"API updates successful: {results['api_updates_success']}")
    print(f"Duration: {results['duration_seconds']:.1f}s")
    print(f"{'='*60}\n")
    
    return results


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Price scraper for affiliate sites")
    parser.add_argument("--project", choices=["theresmac", "gpudrip", "both"], 
                       default="both", help="Which project to scrape")
    parser.add_argument("--proxy", action="store_true", 
                       help="Use proxy service (ScraperAPI)")
    parser.add_argument("--output", "-o", help="Save results to JSON file")
    
    args = parser.parse_args()
    
    all_results = []
    
    if args.project in ["theresmac", "both"]:
        result = await run_scraper("theresmac", use_proxy=args.proxy)
        all_results.append(result)
    
    if args.project in ["gpudrip", "both"]:
        result = await run_scraper("gpudrip", use_proxy=args.proxy)
        all_results.append(result)
    
    # Save results if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(all_results, f, indent=2)
        print(f"Results saved to {args.output}")
    
    # Exit with error code if any scraper failed
    any_failed = any(len(r.get("errors", [])) > 5 for r in all_results)
    sys.exit(1 if any_failed else 0)


if __name__ == "__main__":
    asyncio.run(main())