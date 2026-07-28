$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assetDirectory = Resolve-Path (Join-Path $PSScriptRoot "../media-assets")
$sizes = @{
  "readme-hero.png" = @(1600, 900)
  "dashboard-overview.png" = @(1440, 900)
  "cycle-explorer.png" = @(1440, 900)
  "pull-request-report.png" = @(1440, 900)
  "architecture-rule.png" = @(1440, 900)
}

foreach ($name in $sizes.Keys) {
  $file = Join-Path $assetDirectory $name
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Missing captured asset: $name"
  }

  $source = [System.Drawing.Image]::FromFile($file)
  try {
    $width = $sizes[$name][0]
    $height = $sizes[$name][1]
    if ($source.Width -gt $width -or $source.Height -gt $height) {
      throw "$name is $($source.Width)x$($source.Height); capture it at or below ${width}x${height} to avoid resampling."
    }

    $canvas = New-Object System.Drawing.Bitmap($width, $height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        $graphics.Clear([System.Drawing.Color]::FromArgb(2, 6, 23))
        $x = [Math]::Floor(($width - $source.Width) / 2)
        $y = [Math]::Floor(($height - $source.Height) / 2)
        $graphics.DrawImageUnscaled($source, $x, $y)
      }
      finally {
        $graphics.Dispose()
      }

      $temporary = "$file.normalized"
      $canvas.Save($temporary, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $canvas.Dispose()
    }
  }
  finally {
    $source.Dispose()
  }

  Copy-Item -LiteralPath $temporary -Destination $file -Force
  Remove-Item -LiteralPath $temporary -Force
}

Write-Output "Normalized five lossless demo assets to their documented dimensions."
