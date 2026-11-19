# Daily local scrape for the sources GitHub Actions cannot reach.
#
# Four datasets can only be refreshed from a residential IP, because their origins
# block GitHub's datacenter ranges:
#   - Bazaraki cars        - Cloudflare challenge on every runner IP
#   - EAC (AHK) jobs       - TCP connection dropped from runner IPs (ERR_CONNECTION_TIMED_OUT)
#   - Foody souvlaki       - HTTP 403 on Foody's sitemap from runner IPs
#   - Foody coffee         - same
#
# The daily public-jobs Action still runs in CI for the other ~61 sources and
# CARRIES FORWARD the EAC's last-known-good openings between these local runs, so the
# EAC never vanishes - the jobs step keeps that carried data fresh. It runs a FULL
# jobs scrape (not --only, which would overwrite the file with one source).
#
# Every step is independent: a failure in one is logged and the others still run.
# A scrape that exits non-zero (the Foody scripts exit 1 when they only carried the old
# scan forward) is NEVER committed.
#
# IMPORTANT: keep this file ASCII-only. Windows PowerShell 5.1 reads a BOM-less UTF-8
# script as ANSI, so an em dash (bytes E2 80 94) becomes a curly double quote that ends
# the string and the whole file stops parsing. That is why the task exited with code 1
# from 2026-08-10 until it was fixed: it died at parse time, before the first log line.
#
# Register the daily task (run once, in PowerShell):
#   $a = New-ScheduledTaskAction -Execute 'powershell.exe' `
#     -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\mikmy\Documents\repos\deals-blog\scripts\ci\local-daily.ps1"'
#   $t = New-ScheduledTaskTrigger -Daily -At 6:30am
#   Register-ScheduledTask -TaskName 'deals-blog local daily' -Action $a -Trigger $t
#
# The task's ExecutionTimeLimit is 2 hours; a full run takes roughly 60-75 minutes.

$ErrorActionPreference = 'Continue'
# DEALS_BLOG_REPO lets a test run use another checkout (a worktree on master); the scheduled
# task never sets it.
$repo = if ($env:DEALS_BLOG_REPO) { $env:DEALS_BLOG_REPO } else { 'C:\Users\mikmy\Documents\repos\deals-blog' }
Set-Location $repo

$log = Join-Path $repo 'scripts\ci\local-daily.log'
# The log is UTF-8. (Tee-Object / Out-File in Windows PowerShell 5.1 default to UTF-16, which reads as
# spaced-out characters in most tools.) An old UTF-16 log is moved aside once so the file never mixes encodings.
if (Test-Path $log) {
  $head = [System.IO.File]::ReadAllBytes($log) | Select-Object -First 2
  if ($head.Count -ge 2 -and $head[0] -eq 0xFF -and $head[1] -eq 0xFE) { Move-Item -Force $log ($log + '.utf16.old') }
}
function Log($m) { Add-Content -Path $log -Value "$(Get-Date -Format o)  $m" -Encoding UTF8 }

$script:changed = $false
$script:failures = @()

# Run a scrape; true only when it exited 0. npm/node is a native command, so a non-zero
# exit does not throw in PowerShell - we must check $LASTEXITCODE.
function Scrape($label, $npmArgs) {
  Log "Scraping $label"
  try {
    & npm run $npmArgs 2>&1 | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
      Log "ERROR: '$label' scrape exited $LASTEXITCODE - leaving its data untouched"
      $script:failures += $label
      return $false
    }
    return $true
  } catch {
    Log "ERROR: '$label' threw: $($_.Exception.Message)"
    $script:failures += $label
    return $false
  }
}

function ScrapeNode($label, $scriptPath) {
  Log "Scraping $label"
  try {
    & node $scriptPath 2>&1 | ForEach-Object { Log "  $_" }
    if ($LASTEXITCODE -ne 0) {
      Log "ERROR: '$label' scrape exited $LASTEXITCODE - not committing (it may only be a carried-over scan)"
      $script:failures += $label
      return $false
    }
    return $true
  } catch {
    Log "ERROR: '$label' threw: $($_.Exception.Message)"
    $script:failures += $label
    return $false
  }
}

function Restore($paths) {
  # undo a failed/partial scrape so the next step's commit does not pick it up
  git checkout -- $paths 2>&1 | Out-Null
}

function CommitIf($paths, $message) {
  git add $paths
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m $message
    if ($LASTEXITCODE -eq 0) {
      $script:changed = $true
      Log "Committed: $message"
    } else {
      Log "ERROR: commit failed: $message"
      $script:failures += "commit: $message"
    }
  } else {
    Log "No change: $message"
  }
}

# Run one step; whatever happens inside, the next step still runs.
function Step($name, [scriptblock]$body) {
  try { & $body } catch {
    Log "ERROR: step '$name' failed: $($_.Exception.Message)"
    $script:failures += $name
  }
}

$today = Get-Date -Format 'yyyy-MM-dd'
$started = Get-Date
Log "=== local daily start ==="

# The task commits to master. Refuse to run on a feature branch or with a stuck rebase,
# otherwise data commits would land on the wrong branch.
$branch = (git rev-parse --abbrev-ref HEAD 2>&1 | Out-String).Trim()
if ($branch -ne 'master') {
  Log "SKIPPED: the repo is on branch '$branch', not master. Check out master (or finish the work) and the next run will go ahead."
  exit 2
}

Step 'pull' {
  Log 'Pulling latest master'
  git pull --rebase --autostash origin master 2>&1 | ForEach-Object { Log "  git: $_" }
  if ($LASTEXITCODE -ne 0) { throw "git pull --rebase exited $LASTEXITCODE" }
}

Step 'jobs' {
  # Full public-sector jobs scrape from a residential IP: gets the EAC and any other
  # source the runner IPs are blocked from.
  $files = @('src/data/public-jobs.json', 'src/data/public-jobs-seen.json', 'src/data/public-jobs-pdf-cache.json')
  if (Scrape 'public-sector jobs (full)' 'jobs') {
    CommitIf $files "chore: local jobs refresh (incl. EAC) $today"
  } else { Restore $files }
}

Step 'cars' {
  # Bazaraki cars - Cloudflare blocks CI, so this is the only path that works.
  $files = @('src/data/bazaraki-cars.json')
  if (Scrape 'Bazaraki cars' 'cars:local') {
    CommitIf $files "chore: update bazaraki cars $today"
  } else { Restore $files }
}

# The Foody scans drive a headless Chromium. Playwright expects one exact browser build for the installed
# version; if it is missing (a dependency bump, or the cache was cleaned) every Foody scan dies with
# "Executable doesn't exist" (that happened on 2026-11-17). Check first, install if needed, and say so in the log.
function EnsurePlaywright {
  & node scripts/ci/check-playwright.mjs 2>&1 | ForEach-Object { Log "  pw: $_" }
  if ($LASTEXITCODE -eq 0) { return $true }
  Log 'Playwright browser missing or unusable - installing chromium (node node_modules/playwright/cli.js install chromium)'
  & node node_modules/playwright/cli.js install chromium 2>&1 | ForEach-Object { Log "  pw-install: $_" }
  & node scripts/ci/check-playwright.mjs 2>&1 | ForEach-Object { Log "  pw: $_" }
  if ($LASTEXITCODE -eq 0) { Log 'Playwright browser installed and verified'; return $true }
  Log 'ERROR: Playwright browser still unusable after install'
  $script:failures += 'playwright browser'
  return $false
}
$script:pwOk = $null

Step 'foody-souvlaki' {
  if ($null -eq $script:pwOk) { $script:pwOk = EnsurePlaywright }
  if (-not $script:pwOk) { throw 'Playwright browser unavailable - skipping the Foody scans' }
  # Foody blocks GitHub's runners (HTTP 403 on its sitemap), so this is the only path that
  # produces real Foody data. The script exits non-zero when discovery is blocked, in
  # which case nothing is committed.
  $files = @('src/data/souvlaki-prices-foody.json', 'src/data/souvlaki-prices.json', 'src/data/history/souvlaki')
  if (ScrapeNode 'Foody souvlaki' 'scripts/update-souvlaki-prices-foody.mjs') {
    CommitIf $files "chore: update souvlaki prices from Foody (local) $today"
  } else { Restore $files }
}

Step 'foody-coffee' {
  if (-not $script:pwOk) { throw 'Playwright browser unavailable - skipping the Foody scans' }
  $files = @('src/data/coffee-prices-foody.json', 'src/data/coffee-prices.json', 'src/data/history/coffee')
  if (ScrapeNode 'Foody coffee' 'scripts/update-coffee-prices-foody.mjs') {
    CommitIf $files "chore: update coffee prices from Foody (local) $today"
  } else { Restore $files }
}

Step 'push' {
  if ($script:changed) {
    # Automated data commits land on master constantly, so by push time origin has
    # usually moved on. Rebase onto it and retry rather than logging "Done" over a
    # rejected push (which once stranded a commit locally for a day).
    # git's own output is logged so a failure says why; waits grow between tries
    # so a burst of CI data commits (or another local push) can settle.
    Log 'Pushing (rebase-on-reject, up to 5 tries)'
    $pushed = $false
    $waits = @(0, 15, 45, 90, 180)
    for ($i = 1; $i -le 5 -and -not $pushed; $i++) {
      if ($waits[$i - 1] -gt 0) { Log "  waiting $($waits[$i - 1])s before attempt $i"; Start-Sleep -Seconds $waits[$i - 1] }
      git push origin master 2>&1 | ForEach-Object { Log "  git push: $_" }
      if ($LASTEXITCODE -eq 0) { $pushed = $true; break }
      Log "Push rejected (attempt $i); rebasing on origin/master"
      git fetch origin master 2>&1 | ForEach-Object { Log "  git fetch: $_" }
      git rebase --autostash origin/master 2>&1 | ForEach-Object { Log "  git rebase: $_" }
      if ($LASTEXITCODE -ne 0) {
        Log '  rebase failed; aborting it so the next try starts clean'
        git rebase --abort 2>&1 | ForEach-Object { Log "  git rebase --abort: $_" }
      }
    }
    if ($pushed) {
      gh workflow run deploy.yml --ref master
      Log 'Pushed and triggered redeploy.'
    } else {
      Log 'ERROR: push still failing after 5 attempts - commits are local only.'
      $script:failures += 'push'
    }
  } else {
    Log 'Nothing changed; no push.'
  }
}

$mins = [math]::Round(((Get-Date) - $started).TotalMinutes, 1)
if ($script:failures.Count -gt 0) {
  Log "Done with failures after $mins min: $($script:failures -join '; ')"
  exit 1
}
Log "Done in $mins min."
exit 0
