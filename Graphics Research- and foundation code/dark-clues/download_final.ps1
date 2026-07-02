# Download assets from itch.io
# This script downloads the actual assets needed by Dark Clues

$baseUrl = "https://html-classic.itch.zone/html/5437722/bin/assets/"
$assetsDir = "J:\BKU\New folder\dark-clues\Assets"

# Create assets directory if it doesn't exist
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

$files = @(
    "ambience.ogg",
    "footstep.ogg", 
    "ghost_attack.ogg",
    "hero_attack.ogg",
    "bass.ogg",
    "death.ogg",
    "victory.ogg",
    "clues.json",
    "favicon.png"
)

Write-Host "Downloading Dark Clues assets ($($files.Count) files)..." -ForegroundColor Green

$downloaded = 0
$failed = 0

foreach ($file in $files) {
    $source = $baseUrl + $file
    $dest = Join-Path $assetsDir $file
    
    try {
        Write-Host "Downloading $file..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $source -OutFile $dest -UseBasicParsing -TimeoutSec 30
        Write-Host "  ✓ SUCCESS: $file downloaded" -ForegroundColor Green
        $downloaded++
    } catch {
        Write-Host "  ✗ FAILED: $file - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`nDownload Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Successfully downloaded: $downloaded files" -ForegroundColor Green
Write-Host "  ✗ Failed to download: $failed files" -ForegroundColor Red
Write-Host "  Total files attempted: $($files.Count)" -ForegroundColor White

if ($downloaded -eq $files.Count) {
    Write-Host "`n🎉 All assets downloaded successfully! Dark Clues should now work properly." -ForegroundColor Green
} else {
    Write-Host "`n⚠️ Some files failed to download. You may need to manually download the missing assets." -ForegroundColor Yellow
}
