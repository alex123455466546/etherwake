# Builds desktop\build\Etherwake.exe with Visual Studio's C++ compiler.
#
# Needs Visual Studio 2022 or later, or the free Build Tools, with "Desktop development with C++".
# The WebView2 SDK is fetched from NuGet the first time, checked against a known hash, and kept in desktop\build.
#
#   powershell -ExecutionPolicy Bypass -File desktop\build.ps1
#
# Size: the exe links the C++ runtime statically but uses the Universal CRT that is part of Windows 10 and 11
# ("hybrid CRT"), so it needs no Visual C++ redistributable and stays small.

$ErrorActionPreference = 'Stop'
$sdkVersion = '1.0.4258.31'
$sdkSha256 = '56F7F4B8BF9AEE4B8EFEFBBDD4F67D5F74EBD1B100ED0806DA71BF76AF481AA9'

$here = $PSScriptRoot
$out = Join-Path $here 'build'
New-Item -ItemType Directory -Force $out | Out-Null

function Invoke-Tool($exe, [string[]]$arguments) {
  & $exe @arguments
  if ($LASTEXITCODE -ne 0) { throw "$exe failed with exit code $LASTEXITCODE" }
}

# 1. Visual Studio's compiler environment, unless this shell already has it
if (-not $env:VCINSTALLDIR) {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
  if (-not (Test-Path $vswhere)) { throw 'Visual Studio was not found. Install the Build Tools with "Desktop development with C++".' }
  $vs = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if (-not $vs) { throw 'Visual Studio has no C++ tools. Add "Desktop development with C++" in the Visual Studio Installer.' }
  Import-Module (Join-Path $vs 'Common7\Tools\Microsoft.VisualStudio.DevShell.dll')
  Enter-VsDevShell -VsInstallPath $vs -SkipAutomaticLocation -DevCmdArguments '-arch=x64 -host_arch=x64' | Out-Null
}

# 2. The WebView2 SDK: headers and the static loader, so the exe needs no WebView2Loader.dll beside it
$sdk = Join-Path $out "webview2-$sdkVersion"
if (-not (Test-Path (Join-Path $sdk 'build\native\include\WebView2.h'))) {
  $zip = "$sdk.zip"
  Write-Host "Downloading the WebView2 SDK $sdkVersion"
  Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/$sdkVersion/microsoft.web.webview2.$sdkVersion.nupkg" -OutFile $zip -UseBasicParsing
  if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $sdkSha256) {
    Remove-Item $zip
    throw 'The WebView2 SDK download did not match its expected SHA-256.'
  }
  Expand-Archive $zip $sdk -Force
  Remove-Item $zip
}

# 2b. The page to embed: node tools/build.mjs --release makes dist\Etherwake.html
Push-Location (Join-Path $here '..'); try { Invoke-Tool node @('tools/build.mjs', '--release') } finally { Pop-Location }
Copy-Item (Join-Path $here '..\dist\Etherwake.html') (Join-Path $out 'game.html') -Force

# 3. Resources (icon, the game, manifest, version) and the exe. Run from desktop\ so the .rc paths resolve.
Push-Location $here
try {
  Invoke-Tool rc @('/nologo', '/fo', "$out\etherwake.res", 'etherwake.rc')
  Invoke-Tool cl @(
    '/nologo', '/std:c++17', '/utf-8', '/W4', '/permissive-', '/EHsc',
    '/O1', '/Gy', '/Gw', '/GL', '/GS', '/MT', '/DNDEBUG', '/DUNICODE', '/D_UNICODE',
    '/I', "$sdk\build\native\include",
    'main.cpp', "$out\etherwake.res",
    "/Fo$out\main.obj", "/Fe$out\Etherwake.exe",
    '/link', '/SUBSYSTEM:WINDOWS', '/LTCG', '/OPT:REF', '/OPT:ICF', '/MANIFEST:NO', '/DEBUG:NONE',
    '/NODEFAULTLIB:libucrt.lib', 'ucrt.lib',
    "$sdk\build\native\x64\WebView2LoaderStatic.lib",
    'user32.lib', 'gdi32.lib', 'ole32.lib', 'oleaut32.lib', 'shell32.lib', 'shlwapi.lib', 'dwmapi.lib',
    'advapi32.lib', 'version.lib', 'uuid.lib'
  )
} finally {
  Pop-Location
}

$exe = Get-Item "$out\Etherwake.exe"
Write-Host ("Built {0} ({1:N0} KB)" -f $exe.FullName, ($exe.Length / 1KB))

# Everything it loads must already be on a Windows 10 or 11 PC
$dlls = dumpbin /nologo /dependents $exe.FullName | Where-Object { $_ -match '^\s+\S+\.dll\s*$' } | ForEach-Object { $_.Trim() }
Write-Host "Loads: $($dlls -join ', ')"
$extra = $dlls | Where-Object { $_ -match '^(vcruntime|msvcp|concrt|WebView2Loader)' }
if ($extra) { throw "Etherwake.exe would need DLLs that Windows does not ship: $($extra -join ', ')" }
