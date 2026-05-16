<#
.SYNOPSIS
  Upload Vite dist/ to Linux (scp + ssh + sudo).

  Prerequisites: OpenSSH (scp, ssh), built dist (npm run build).

  Edit $RemoteUserHost or pass: -RemoteUserHost "opc@203.0.113.50"
#>
param(
  [Parameter(Mandatory = $false)]
  [string]$RemoteUserHost = "opc@YOUR_SERVER_IP",
  [string]$RemoteTmp = "/tmp/erb-frontend-dist",
  [string]$WebRoot = "/var/www/tipsyfoxbuilder"
)

$ErrorActionPreference = "Stop"
$Dist = (Resolve-Path (Join-Path $PSScriptRoot "..\dist")).Path

if (-not (Test-Path (Join-Path $Dist "index.html"))) {
  Write-Error "Missing dist\index.html. Run: cd Dev\app\frontend ; npm run build"
}

Write-Host "Uploading to ${RemoteUserHost}:$RemoteTmp ..."
ssh $RemoteUserHost "mkdir -p $RemoteTmp && rm -rf $RemoteTmp/*"
scp -r "$Dist\*" "${RemoteUserHost}:$RemoteTmp/"

$bash = "sudo mkdir -p $WebRoot && sudo rm -rf $WebRoot/assets && sudo find $WebRoot -maxdepth 1 -type f -delete 2>/dev/null ; true"
$bash += " && sudo cp -r $RemoteTmp/* $WebRoot/ && sudo chown -R www-data:www-data $WebRoot && rm -rf $RemoteTmp/* && ls -la $WebRoot | head"

Write-Host "Promoting to $WebRoot on server ..."
ssh $RemoteUserHost "bash -lc '$bash'"

Write-Host "Done. In browser: hard refresh (Ctrl+Shift+R). Nginx root should be $WebRoot."
