# (Re)registers the ClaudeUsageExport scheduled task: daily 18:00, runs export-claude.ps1.
# Idempotent - an existing task of the same name is removed first.
$ErrorActionPreference = 'Stop'

$taskName = 'ClaudeUsageExport'
$repoRoot = Split-Path $PSScriptRoot -Parent
$script = Join-Path $PSScriptRoot 'export-claude.ps1'

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`"" `
  -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '18:00'
# StartWhenAvailable: a run missed while the machine was off fires at next logon/wake.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Export Claude Code daily token totals to the Crawford-Young profile repo' | Out-Null
Write-Output "Registered scheduled task '$taskName' (daily 18:00): $script"
