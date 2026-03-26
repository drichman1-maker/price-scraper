#!/bin/bash
# GitHub Actions Secrets Setup Script

# Backend URLs
gh secret set THERESMAC_API_URL --body "https://theresmac-backend.fly.dev"
gh secret set GPUDRIP_API_URL --body "https://gpudrip-backend.fly.dev"

# API Keys
gh secret set THERESMAC_API_KEY --body "kTT9f4MP4nisVi2tNiP0ismcr44mBeOMOVhlGm4hcPA"
gh secret set GPUDRIP_API_KEY --body "kTT9f4MP4nisVi2tNiP0ismcr44mBeOMOVhlGm4hcPA"
gh secret set SCRAPER_API_KEY --body "kTT9f4MP4nisVi2tNiP0ismcr44mBeOMOVhlGm4hcPA"

# Affiliate IDs
gh secret set AMAZON_AFFILIATE_ID --body "Theresmac-20"
gh secret set EBAY_AFFILIATE_ID --body "5339142921"

echo "✅ Secrets configured! Add product mappings next."
