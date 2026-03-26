#!/bin/bash
# Local test environment setup

echo "Setting up test environment..."

export THERESMAC_API_URL="https://theresmac-backend.fly.dev"
export THERESMAC_API_KEY="kTT9f4MP4nisVi2tNiP0ismcr44mBeOMOVhlGm4hcPA"
export AMAZON_AFFILIATE_ID="Theresmac-20"
export EBAY_AFFILIATE_ID="5339142921"

# Load test products
export THERESMAC_PRODUCTS_JSON=$(cat ~/.openclaw/workspace/scrapers/test_products.json)

echo "Environment configured!"
echo ""
echo "Next: pip install -r requirements.txt"
