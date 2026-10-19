@echo off
rem Double-click to build desktop\build\Etherwake.exe. See build.ps1 for what it needs.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1"
if errorlevel 1 (echo. & echo Build failed.) else (echo. & echo Done.)
pause
