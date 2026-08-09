# Daily local Bazaraki car scrape.
#
# Bazaraki's Cloudflare challenge blocks every GitHub Actions runner IP, so the
# car scrape cannot run in CI (see .github/workflows/update-bazaraki-cars.yml).
# This script is the sanctioned "daily" path: it runs on the laptop via Windows
# Task Scheduler, refreshes the data, and commits + pushes only when something
# changed. The scraper itself already diffs against the previous run, so the
# committed JSON carries new / changed / removed listings — this wrapper only
# decides whether there is anything worth publishing.
#
# Register the daily task (run once, in PowerShell):
#   $a = New-ScheduledTaskAction -Execute 'powershell.exe' `
#     -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\mikmy\Documents\repos\deals-blog\scripts\ci\cars-local-daily.ps1"'
#   $t = New-ScheduledTaskTrigger -Daily -At 7:30am
#   Register-ScheduledTask -TaskName 'deals-blog cars daily' -Action $a -Trigger $t -Description 'Daily Bazaraki car scrape (Cloudflare blocks CI)'

$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\mikmy\Documents\repos\deals-blog'
Set-Location $repo

$log = Join-Path $repo 'scripts\ci\cars-local-daily.log'
function Log($m) { "$(Get-Date -Format o)  $m" | Tee-Object -FilePath $log -Append }

try {
  Log 'Pulling latest master'
  git pull --ff-only origin master

  Log 'Scraping Bazaraki cars'
  npm run cars:local

  git add src/data/bazaraki-cars.json
  git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    Log 'No change in car listings; nothing to publish.'
    exit 0
  }

  $today = Get-Date -Format 'yyyy-MM-dd'
  Log 'Change detected; committing and pushing'
  git commit -m "chore: update bazaraki cars $today"
  git push origin master
  gh workflow run deploy.yml --ref master
  Log 'Published and triggered redeploy.'
}
catch {
  Log "FAILED: $($_.Exception.Message)"
  exit 1
}
