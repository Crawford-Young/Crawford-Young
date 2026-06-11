Set-Location (Split-Path $PSScriptRoot -Parent)
git pull --rebase
pnpm install --frozen-lockfile
pnpm export-claude
git add data/claude-usage.json
git diff --staged --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "chore: update claude usage data"
  git push
  if ($LASTEXITCODE -ne 0) {
    git pull --rebase
    git push
  }
}
