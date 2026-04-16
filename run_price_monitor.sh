#!/bin/bash

# Price Monitor - Manual Run Script
# Usage: ./run_price_monitor.sh [options]
# Options:
#   --alert-only    Show only deals and premiums
#   --theresmac     Scan only TheresMac
#   --gpudrip       Scan only GPU Drip

cd "$(dirname "$0")"

echo "=========================================="
echo "PRICE MONITOR - MANUAL RUN"
echo "=========================================="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S EST')"
echo ""

# Run Python script with args
python3 price_monitor.py "$@"

echo ""
echo "=========================================="
echo "DONE"
echo "=========================================="
echo "Results: price_monitor_results.json"
echo "Dashboard: price_monitor_dashboard.html"
echo ""
