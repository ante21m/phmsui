$ErrorActionPreference = "Stop"

# Verify standalone build
if (!(Test-Path ".next/standalone/server.js")) {
    throw "Standalone server.js not found. Run npm run build first."
}

# Copy standalone application files to root
Copy-Item ".next/standalone/*" "." -Recurse -Force

# Copy public assets
if (Test-Path "public") {
    Copy-Item "public" ".next/public" -Recurse -Force
}

# Copy Next.js static assets
New-Item -ItemType Directory -Force ".next/static" | Out-Null

Copy-Item ".next/standalone/.next/static/*" `
    ".next/static/" -Recurse -Force

Write-Host "Standalone deployment prepared successfully!"