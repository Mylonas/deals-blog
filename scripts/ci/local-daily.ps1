# Daily local scrape for the sources GitHub Actions cannot reach.
#
# Two datasets can only be refreshed from a residential IP, because their origins
# firewall GitHub's datacenter ranges at the network layer:
#   - Bazaraki cars      — Cloudflare challenge on every runner IP
#   - ΑΗΚ (EAC) jobs     — TCP connection dropped from runner IPs (ERR_CONNECTION_TIMED_OUT)
#
# The daily public-jobs Action still runs in CI for the other ~61 sources and
# CARRIES FORWARD ΑΗΚ's last-known-good openings between these local runs, so
# ΑΗΚ never vanishes — this job is what keeps that carried data fresh. It runs a
# FULL jobs scrape (not --only, which would overwrite the file with one source).
#
# Register the daily task (run once, in PowerShell):
#   $a = New-ScheduledTaskAction -Execute 'powershell.exe' `
#     -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\mikmy\Documents\repos\deals-blog\scripts\ci\local-daily.ps1"'
#   $t = New-ScheduledTaskTrigger -Daily -At 7:30am
#   Register-ScheduledTask -TaskName 'deals-blog local daily' -Action $a -Trigger $t

$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\mikmy\Documents\repos\deals-blog'
Set-Location $repo

$log = Join-Path $repo 'scripts\ci\local-daily.log'
function Log($m) { "$(Get-Date -Format o)  $m" | Tee-Object -FilePath $log -Append }

$changed = $false

function CommitIf($paths, $message) {
  git add $paths
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m $message
    $script:changed = $true
    Log "Committed: $message"
  } else {
    Log "No change: $message"
  }
}

try {
  Log 'Pulling latest master'
  git pull --ff-only origin master

  # Full public-sector jobs scrape from a residential IP: gets ΑΗΚ and any other
  # source the runner IPs are blocked from.
  Log 'Scraping public-sector jobs (full)'
  npm run jobs
  CommitIf @(
    'src/data/public-jobs.json',
    'src/data/public-jobs-seen.json',
    'src/data/public-jobs-pdf-cache.json'
  ) "chore: local jobs refresh (incl. ΑΗΚ) $(Get-Date -Format 'yyyy-MM-dd')"

  # Bazaraki cars — Cloudflare blocks CI, so this is the only path that works.
  Log 'Scraping Bazaraki cars'
  npm run cars:local
  CommitIf @('src/data/bazaraki-cars.json') "chore: update bazaraki cars $(Get-Date -Format 'yyyy-MM-dd')"

  if ($changed) {
    Log 'Pushing and triggering redeploy'
    git push origin master
    gh workflow run deploy.yml --ref master
  } else {
    Log 'Nothing changed; no push.'
  }
  Log 'Done.'
}
catch {
  Log "FAILED: $($_.Exception.Message)"
  exit 1
}
