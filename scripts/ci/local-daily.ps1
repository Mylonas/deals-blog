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

# Run a scrape and FAIL LOUDLY if it errors. npm/node is a native command, so a
# non-zero exit does not throw in PowerShell — we must check $LASTEXITCODE, or a
# crashed scrape silently looks like "nothing changed" (which is exactly how a
# failed jobs run once masked itself). Output is teed into the log for diagnosis.
function Scrape($label, $npmScript) {
  Log "Scraping $label"
  npm run $npmScript 2>&1 | Tee-Object -FilePath $log -Append | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Log "ERROR: '$label' scrape exited $LASTEXITCODE — leaving its data untouched"
    return $false
  }
  return $true
}

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
  git pull --rebase --autostash origin master

  # Full public-sector jobs scrape from a residential IP: gets ΑΗΚ and any other
  # source the runner IPs are blocked from. Only commit if the scrape succeeded.
  if (Scrape 'public-sector jobs (full)' 'jobs') {
    CommitIf @(
      'src/data/public-jobs.json',
      'src/data/public-jobs-seen.json',
      'src/data/public-jobs-pdf-cache.json'
    ) "chore: local jobs refresh (incl. ΑΗΚ) $(Get-Date -Format 'yyyy-MM-dd')"
  }

  # Bazaraki cars — Cloudflare blocks CI, so this is the only path that works.
  if (Scrape 'Bazaraki cars' 'cars:local') {
    CommitIf @('src/data/bazaraki-cars.json') "chore: update bazaraki cars $(Get-Date -Format 'yyyy-MM-dd')"
  }

  if ($changed) {
    # Automated data commits land on master constantly, so by push time origin
    # has usually moved on. Rebase onto it and retry rather than logging "Done"
    # over a rejected push (which once stranded a commit locally for a day).
    Log 'Pushing (rebase-on-reject, up to 3 tries)'
    $pushed = $false
    for ($i = 1; $i -le 3 -and -not $pushed; $i++) {
      git push origin master
      if ($LASTEXITCODE -eq 0) { $pushed = $true; break }
      Log "Push rejected (attempt $i); rebasing on origin/master"
      git fetch origin master
      git rebase origin/master
    }
    if ($pushed) {
      gh workflow run deploy.yml --ref master
      Log 'Pushed and triggered redeploy.'
    } else {
      Log 'ERROR: push still failing after 3 attempts — commit is local only.'
      exit 1
    }
  } else {
    Log 'Nothing changed; no push.'
  }
  Log 'Done.'
}
catch {
  Log "FAILED: $($_.Exception.Message)"
  exit 1
}
