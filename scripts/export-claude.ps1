# Exports daily Claude Code token totals to data/claude-usage.json and pushes them.
# Run by the ClaudeUsageExport scheduled task (scripts/register-export-task.ps1).
# Only runs on a clean `main` checkout so it never commits onto a feature branch.
Set-Location (Split-Path $PSScriptRoot -Parent)

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne 'main') {
  Write-Output "export-claude: skipped - checkout is on '$branch', not main"
  exit 0
}
$dirty = git status --porcelain | Where-Object { $_.Substring(3) -notlike 'data/*' }
if ($dirty) {
  Write-Output "export-claude: skipped - working tree has changes outside data/"
  exit 0
}

git pull --rebase --autostash
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pnpm export-claude
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git add data/claude-usage.json
git diff --staged --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "chore: update claude usage data"
  git push
  if ($LASTEXITCODE -ne 0) {
    git pull --rebase --autostash
    git push
  }
}
