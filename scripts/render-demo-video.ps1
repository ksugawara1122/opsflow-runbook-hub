[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$FfmpegPath,

  [Parameter(Mandatory = $true)]
  [string]$FrameDirectory,

  [string]$OutputPath = (Join-Path $PSScriptRoot '..\portfolio\assets\opsflow-demo-90s.mp4')
)

$ErrorActionPreference = 'Stop'
$durations = @(8, 10, 10, 10, 11, 11, 10, 10, 10)
$arguments = @('-hide_banner', '-loglevel', 'warning', '-y')
$filters = @()
$concatInputs = ''

if (-not (Test-Path -LiteralPath $FfmpegPath -PathType Leaf)) {
  throw "ffmpeg was not found: $FfmpegPath"
}

for ($index = 0; $index -lt $durations.Count; $index += 1) {
  $frame = Join-Path $FrameDirectory "frame-$index.jpg"
  if (-not (Test-Path -LiteralPath $frame -PathType Leaf)) {
    throw "Demo frame was not found: $frame"
  }

  $arguments += @(
    '-loop', '1',
    '-framerate', '30',
    '-t', [string]$durations[$index],
    '-i', $frame
  )
  $filters += "[$index`:v]crop=1280:720:0:0,setsar=1,fps=30,format=yuv420p[v$index]"
  $concatInputs += "[v$index]"
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $outputFullPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$filters += "$concatInputs concat=n=$($durations.Count):v=1:a=0[outv]"
$arguments += @(
  '-filter_complex', ($filters -join ';'),
  '-map', '[outv]',
  '-t', '90',
  '-an',
  '-c:v', 'libx264',
  '-profile:v', 'high',
  '-level:v', '4.0',
  '-preset', 'medium',
  '-crf', '22',
  '-pix_fmt', 'yuv420p',
  '-r', '30',
  '-g', '60',
  '-color_primaries', 'bt709',
  '-color_trc', 'bt709',
  '-colorspace', 'bt709',
  '-movflags', '+faststart',
  '-map_metadata', '-1',
  $outputFullPath
)

& $FfmpegPath @arguments
if ($LASTEXITCODE -ne 0) {
  throw "ffmpeg failed with exit code $LASTEXITCODE"
}

Get-Item -LiteralPath $outputFullPath | Select-Object FullName, Length, LastWriteTime
