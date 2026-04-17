#Requires -Version 5.1

# Deploy script for Citadel deployment system
# All configuration is read from .env in the same directory as this script.
# Usage: .\deploy.ps1 [source-path]

$ErrorActionPreference = 'Stop'

# Load .env from same directory as this script
$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) {
    Write-Error "Error: .env file not found at $envFile"
    exit 1
}

foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    $parts = $line.Split('=', 2)
    if ($parts.Count -eq 2) {
        Set-Variable -Name $parts[0].Trim() -Value $parts[1].Trim() -Scope Local
    }
}

# CLI arg overrides SOURCE from .env
if ($args[0]) { $SOURCE = $args[0] }

# Validate required variables
foreach ($var in @('AUTH_TOKEN', 'DEPLOY_URL', 'PROFILE', 'SOURCE')) {
    if (-not (Get-Variable -Name $var -ValueOnly -ErrorAction SilentlyContinue)) {
        Write-Error "Error: $var not set in .env"
        exit 1
    }
}

if (-not $TEMP_DIR) { $TEMP_DIR = if ($env:TEMP) { $env:TEMP } elseif ($env:TMPDIR) { $env:TMPDIR } else { '/tmp' } }

# Validate source exists
if (-not (Test-Path $SOURCE)) {
    Write-Error "Error: source path does not exist: $SOURCE"
    exit 1
}

$SOURCE = $SOURCE.TrimEnd('\', '/')

$tempZip  = Join-Path $TEMP_DIR ("deploy_" + [System.IO.Path]::GetRandomFileName().Replace('.','') + ".zip")
$respFile = Join-Path $TEMP_DIR ("citadel_resp_" + [System.IO.Path]::GetRandomFileName().Replace('.','') + ".txt")

try {
    # Zip the source
    Add-Type -Assembly System.IO.Compression
    Add-Type -Assembly System.IO.Compression.FileSystem

    if ($SOURCE -like '*.zip') {
        Write-Host "Zipping zip file: $SOURCE"
        Copy-Item $SOURCE $tempZip
    } elseif (Test-Path $SOURCE -PathType Container) {
        Write-Host "Zipping directory: $SOURCE"
        $srcFull = [IO.Path]::GetFullPath($SOURCE)
        $name    = [IO.Path]::GetFileName($srcFull)
        $zip     = [IO.Compression.ZipFile]::Open($tempZip, 'Create')
        try {
            Get-ChildItem $srcFull -Recurse -File | ForEach-Object {
                $entry = $name + '/' + $_.FullName.Substring($srcFull.Length + 1).Replace('\', '/')
                [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry) | Out-Null
            }
        } finally {
            $zip.Dispose()
        }
    } else {
        Write-Host "Zipping file: $SOURCE"
        $srcFull = [IO.Path]::GetFullPath($SOURCE)
        $name    = [IO.Path]::GetFileName($srcFull)
        $zip     = [IO.Compression.ZipFile]::Open($tempZip, 'Create')
        try {
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $srcFull, $name) | Out-Null
        } finally {
            $zip.Dispose()
        }
    }

    $zipSize = (Get-Item $tempZip).Length
    $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
    Write-Host "Created zip: ${zipSizeMB} MB"

    # Sign the zip with HMAC-SHA256
    $hmac = [System.Security.Cryptography.HMACSHA256]::new(
        [System.Text.Encoding]::UTF8.GetBytes($AUTH_TOKEN)
    )
    $sig = [BitConverter]::ToString($hmac.ComputeHash([IO.File]::ReadAllBytes($tempZip))).Replace('-','').ToLower()
    $hmac.Dispose()

    # Deploy — stream progress lines as they arrive
    Write-Host "Deploying to $DEPLOY_URL (profile: $PROFILE)"
    $curl = if ($IsWindows) { 'curl.exe' } else { 'curl' }
    & $curl -s --no-buffer -X POST `
        -H "X-Signature: $sig" `
        -H "X-Profile: $PROFILE" `
        -F "file=@$tempZip" `
        $DEPLOY_URL | Tee-Object -FilePath $respFile
    Write-Host ""

    $lastLine = (Get-Content $respFile | Where-Object { $_ } | Select-Object -Last 1)
    if ($lastLine -eq 'OK') {
        Write-Host "Done"
        exit 0
    } else {
        Write-Host "Deploy failed"
        exit 1
    }

} finally {
    if (Test-Path $tempZip)  { Remove-Item $tempZip  -Force -ErrorAction SilentlyContinue }
    if (Test-Path $respFile) { Remove-Item $respFile -Force -ErrorAction SilentlyContinue }
}
