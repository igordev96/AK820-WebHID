@echo off
setlocal
cd /d "%~dp0"
echo Starting the local server for the AK820 WebHID key remapper...
echo.
start "" "http://localhost:8765/"
node "%~dp0serve.js"
