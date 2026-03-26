#!/usr/bin/env python3
"""
Setup script for GitHub Actions secrets
Generates product mappings from your existing product data
"""

import json
import os
import sys

def generate_product_mapping_example():
    """Generate example product mapping structure"""
    example = {
        "macbook-air-15-m3-2024": [
            {
                "retailer": "amazon",
                "url": "https://www.amazon.com/dp/B0CX23V2ZK"
            },
            {
                "retailer": "ebay",
                "url": "https://www.ebay.com/sch/i.html?_nkw=MacBook+Air+15+M3"
            }
        ],
        "macbook-pro-14-m3-pro": [
            {
                "retailer": "amazon",
                "url": "https://www.amazon.com/dp/B0BSHF7WHW"
            }
        ],
        "rtx-4090": [
            {
                "retailer": "amazon",
                "url": "https://www.amazon.com/dp/B0BGJQ4TZP"
            }
        ],
        "rtx-4080-super": [
            {
                "retailer": "amazon",
                "url": "https://www.amazon.com/dp/B0BCSJ99K9"
            }
        ]
    }
    return example

def print_setup_instructions():
    """Print setup instructions for GitHub Actions"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║       GitHub Actions Scraper Setup Instructions              ║
╚══════════════════════════════════════════════════════════════╝

1. PUSH THIS REPO TO GITHUB:
   $ git init
   $ git add .
   $ git commit -m "Initial scraper setup"
   $ gh repo create price-scraper --public --source=. --push

2. ADD GITHUB SECRETS:
   
   Go to: https://github.com/YOUR_USERNAME/price-scraper/settings/secrets/actions
   
   Or use the GitHub CLI:
   
   # Backend URLs
   gh secret set THERESMAC_API_URL --body "https://theresmac-backend.fly.dev"
   gh secret set GPUDRIP_API_URL --body "https://gpudrip-backend.fly.dev"
   
   # API Keys (set these on your backends first)
   gh secret set THERESMAC_API_KEY --body "your-secret-key"
   gh secret set GPUDRIP_API_KEY --body "your-secret-key"
   
   # Affiliate IDs
   gh secret set AMAZON_AFFILIATE_ID --body "Theresmac-20"
   gh secret set EBAY_AFFILIATE_ID --body "5339142921"
   
   # Product mappings (JSON format)
   gh secret set THERESMAC_PRODUCTS_JSON --body "$(cat theresmac-products.json)"
   gh secret set GPUDRIP_PRODUCTS_JSON --body "$(cat gpudrip-products.json)"

3. SET SCRAPER_API_KEY ON BACKENDS:
   
   For TheresMac:
   $ fly secrets set SCRAPER_API_KEY="your-secret-key" -a theresmac-backend
   
   For GPU Drip:
   $ fly secrets set SCRAPER_API_KEY="your-secret-key" -a gpudrip-backend

4. TRIGGER FIRST RUN:
   
   Go to Actions tab → Scrape Prices → Run workflow

═══════════════════════════════════════════════════════════════

Product Mapping Format (JSON):
"""
    )
    
    # Print example
    example = generate_product_mapping_example()
    print(json.dumps(example, indent=2))
    
    print("""

═══════════════════════════════════════════════════════════════

Key = Product SKU (must match backend exactly)
Value = Array of {retailer, url} objects

To create your product mappings:
1. Get product SKUs from your backends
2. Find Amazon/eBay product URLs
3. Format as JSON
4. Upload as GitHub secret

═══════════════════════════════════════════════════════════════
""")

def generate_github_cli_commands(api_key):
    """Generate GitHub CLI commands for setup"""
    commands = f"""#!/bin/bash
# GitHub Actions Secrets Setup Script
# Run: chmod +x setup_secrets.sh && ./setup_secrets.sh

# Backend URLs
gh secret set THERESMAC_API_URL --body "https://theresmac-backend.fly.dev"
gh secret set GPUDRIP_API_URL --body "https://gpudrip-backend.fly.dev"

# API Keys (use same key for both)
gh secret set THERESMAC_API_KEY --body "{api_key}"
gh secret set GPUDRIP_API_KEY --body "{api_key}"
gh secret set SCRAPER_API_KEY --body "{api_key}"

# Affiliate IDs
gh secret set AMAZON_AFFILIATE_ID --body "Theresmac-20"
gh secret set EBAY_AFFILIATE_ID --body "5339142921"

echo "✅ Secrets configured! Now add product mappings:"
echo "   gh secret set THERESMAC_PRODUCTS_JSON --body '$(cat theresmac-products.json)'"
echo "   gh secret set GPUDRIP_PRODUCTS_JSON --body '$(cat gpudrip-products.json)'"
"""
    return commands

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup GitHub Actions for price scraper")
    parser.add_argument("--generate-key", action="store_true", 
                       help="Generate a random API key")
    parser.add_argument("--save-script", action="store_true",
                       help="Save GitHub CLI setup script")
    
    args = parser.parse_args()
    
    print_setup_instructions()
    
    if args.generate_key:
        import secrets
        api_key = secrets.token_urlsafe(32)
        print(f"\n📝 Generated API Key: {api_key}")
        print("\nAdd this to your Fly.io backends:")
        print(f"  fly secrets set SCRAPER_API_KEY=\"{api_key}\" -a theresmac-backend")
        print(f"  fly secrets set SCRAPER_API_KEY=\"{api_key}\" -a gpudrip-backend")
        
        if args.save_script:
            script = generate_github_cli_commands(api_key)
            with open("setup_secrets.sh", "w") as f:
                f.write(script)
            os.chmod("setup_secrets.sh", 0o755)
            print("\n✅ Saved setup_secrets.sh - run it to configure GitHub secrets")
    else:
        print("\n💡 Tip: Run with --generate-key to create a secure API key")
        print("   python setup_github_secrets.py --generate-key --save-script")