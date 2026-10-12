@echo off
title Parcel Log Pro - Web Server
cd /d "%~dp0"
echo ========================================================
echo   Starting Parcel Log Pro Web Server...
echo ========================================================
echo.
echo   Local URL:    http://localhost:5000
echo.
echo   To access from your phone or other devices on Wi-Fi:
echo   Open your browser and type your PC's IP address:
echo   http://^<YOUR_PC_IP^>:5000
echo.
echo   Press Ctrl+C in this window to stop the server anytime.
echo ========================================================
echo.
python server.py
pause
