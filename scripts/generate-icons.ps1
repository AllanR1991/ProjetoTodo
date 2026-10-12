Add-Type -AssemblyName System.Drawing

$destDir = "d:\ProjetoTodo\frontend\public\icons"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

function Create-AppIcon {
    param(
        [int]$Size,
        [string]$OutPath
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $cTop = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)    # Blue 600
    $cBottom = [System.Drawing.Color]::FromArgb(255, 79, 70, 229) # Indigo 600
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBottom, 45.0)
    $g.FillRectangle($brush, $rect)

    # Inner decorative subtle circle
    $innerPad = [int]($Size * 0.12)
    $innerSize = $Size - ($innerPad * 2)
    $innerRect = New-Object System.Drawing.Rectangle($innerPad, $innerPad, $innerSize, $innerSize)
    $circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 255, 255, 255))
    $g.FillEllipse($circleBrush, $innerRect)

    # Checkmark path
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, ($Size * 0.11))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # Points for checkmark
    $p1 = New-Object System.Drawing.PointF(($Size * 0.28), ($Size * 0.52))
    $p2 = New-Object System.Drawing.PointF(($Size * 0.44), ($Size * 0.68))
    $p3 = New-Object System.Drawing.PointF(($Size * 0.74), ($Size * 0.36))

    $points = @($p1, $p2, $p3)
    $g.DrawLines($pen, $points)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Criado: $OutPath"
}

Create-AppIcon -Size 192 -OutPath "$destDir\icon-192.png"
Create-AppIcon -Size 512 -OutPath "$destDir\icon-512.png"
Create-AppIcon -Size 72  -OutPath "$destDir\badge-72.png"
Create-AppIcon -Size 180 -OutPath "$destDir\apple-touch-icon.png"

Write-Output "Todos os icones gerados com sucesso!"
