param([int]$Port = 8765)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$webRoot = Join-Path $root 'app'
if (-not (Test-Path (Join-Path $webRoot 'index.html'))) { throw "App files were not found at $webRoot" }

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Start()

$lanAddresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -ExpandProperty IPAddress -Unique)

Write-Host ''
Write-Host 'WNY Auto Rentals is running.' -ForegroundColor Cyan
Write-Host "Laptop: http://localhost:$Port/" -ForegroundColor Green
foreach ($ip in $lanAddresses) {
  Write-Host "iPhone (same Wi-Fi/hotspot): http://$($ip):$Port/" -ForegroundColor Green
}
Write-Host 'Keep this window open. Press Ctrl+C to stop.' -ForegroundColor Yellow
Start-Process "http://localhost:$Port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.svg' = 'image/svg+xml'
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    $reader = $null
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 4096, $true)
      $requestLine = $reader.ReadLine()
      while ($requestLine) {
        $headerLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($headerLine)) { break }
      }
      if ([string]::IsNullOrEmpty($requestLine)) { continue }
      $parts = $requestLine.Split(' ')
      $url = if ($parts.Count -gt 1) { [Uri]::UnescapeDataString(($parts[1] -split '\?')[0]) } else { '/' }
      if ($url -eq '/') { $url = '/index.html' }
      $relative = $url.TrimStart('/').Replace('/', '\')
      if ($relative.Contains('..')) { throw 'Invalid path' }
      $file = Join-Path $webRoot $relative
      if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        $file = Join-Path $webRoot 'index.html'
      }
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
      $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      $headBytes = [Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headBytes, 0, $headBytes.Length)
      $stream.Write($bytes, 0, $bytes.Length)
    } catch {
      if ($stream) {
        try {
          $message = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n")
          $stream.Write($message, 0, $message.Length)
        } catch {}
      }
    } finally {
      if ($reader) { $reader.Dispose() }
      if ($stream) { $stream.Dispose() }
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
}
