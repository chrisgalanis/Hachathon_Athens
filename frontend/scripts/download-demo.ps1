# ── Download 3Blue1Brown demo clip for LearnReel ─────────────────────────────
# Uses yt-dlp to grab the first ~90 seconds of "Essence of Linear Algebra Ch.1"
# Output: public/videos/3b1b-vectors.mp4  (portrait-cropped, 1080x1920)
#
# Requirements: yt-dlp + ffmpeg on PATH
#   winget install yt-dlp.yt-dlp
#   winget install Gyan.FFmpeg
#
# Run from repo root:
#   .\scripts\download-demo.ps1

$outDir  = "$PSScriptRoot\..\public\videos"
$tmpFile = "$outDir\3b1b-vectors-raw.mp4"
$outFile = "$outDir\3b1b-vectors.mp4"
$url     = "https://www.youtube.com/watch?v=fNk_zzaMoSs"   # Essence of LA Ch.1

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "⬇  Downloading source video (landscape)…" -ForegroundColor Cyan
yt-dlp `
  --format "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]" `
  --merge-output-format mp4 `
  --output $tmpFile `
  $url

if (-not (Test-Path $tmpFile)) {
  Write-Error "Download failed. Is yt-dlp installed?"
  exit 1
}

Write-Host "✂  Trimming to 90 s + cropping to 9:16 portrait…" -ForegroundColor Cyan
# Crop centre square then pad to 9:16 — keeps the 3b1b visuals readable in portrait
ffmpeg -y `
  -ss 00:00:10 -to 00:01:40 `
  -i $tmpFile `
  -vf "crop=ih*9/16:ih,scale=1080:1920,setsar=1" `
  -c:v libx264 -preset fast -crf 23 `
  -c:a aac -b:a 128k `
  -movflags +faststart `
  $outFile

Remove-Item $tmpFile -Force

Write-Host "✅  Done → $outFile" -ForegroundColor Green
Write-Host "    Next.js will serve it at /videos/3b1b-vectors.mp4" -ForegroundColor DarkGray
