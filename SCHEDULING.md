# Price Monitor Scheduling

## Manual Run

```bash
cd ~/.openclaw/workspace/scrapers
./run_price_monitor.sh              # Full scan
./run_price_monitor.sh --alert-only # Only deals/premiums
./run_price_monitor.sh --theresmac  # TheresMac only
```

## Daily Cron Schedule (8 AM EST)

Add to crontab (`crontab -e`):

```cron
# Price Monitor - Daily 8 AM EST
0 8 * * * cd /Users/douglasrichman/.openclaw/workspace/scrapers && ./run_price_monitor.sh >> /tmp/price_monitor.log 2>&1
```

## Hourly Schedule (for deal hunting)

```cron
# Price Monitor - Every hour
0 * * * * cd /Users/douglasrichman/.openclaw/workspace/scrapers && ./run_price_monitor.sh --alert-only >> /tmp/price_monitor.log 2>&1
```

## View Logs

```bash
tail -f /tmp/price_monitor.log
```

## Alternative: launchd (macOS native)

Create `~/Library/LaunchAgents/com.douglasrichman.price-monitor.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.douglasrichman.price-monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/douglasrichman/.openclaw/workspace/scrapers/run_price_monitor.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>8</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/price_monitor.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/price_monitor_error.log</string>
</dict>
</plist>
```

Load with:
```bash
launchctl load ~/Library/LaunchAgents/com.douglasrichman.price-monitor.plist
```

Unload with:
```bash
launchctl unload ~/Library/LaunchAgents/com.douglasrichman.price-monitor.plist
```
