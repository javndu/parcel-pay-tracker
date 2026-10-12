@echo off
setlocal enabledelayedexpansion
title Australia Post Parcel Tracker
cd /d "%~dp0"

:: Auto-detect python.exe and pythonw.exe
set "PYTHON_EXE="
set "PYTHONW_EXE="

:: Check standard WindowsApps locations first
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\pythonw.exe" set "PYTHONW_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\pythonw.exe"

:: Check WindowsApps store package location
if not defined PYTHON_EXE if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe"
if not defined PYTHONW_EXE if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\pythonw.exe" set "PYTHONW_EXE=%LOCALAPPDATA%\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\pythonw.exe"

:: Check standard PATH as fallback
if not defined PYTHON_EXE for %%I in (python.exe) do if not "%%~$PATH:I"=="" set "PYTHON_EXE=%%~$PATH:I"
if not defined PYTHONW_EXE for %%I in (pythonw.exe) do if not "%%~$PATH:I"=="" set "PYTHONW_EXE=%%~$PATH:I"

:: Check standard local installs as fallback
if not defined PYTHON_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if not defined PYTHONW_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python311\pythonw.exe" set "PYTHONW_EXE=%LOCALAPPDATA%\Programs\Python\Python311\pythonw.exe"

if not defined PYTHON_EXE (
    echo [ERROR] Python was not found on your system!
    echo Please make sure Python is installed.
    pause
    exit /b 1
)

if not defined PYTHONW_EXE set "PYTHONW_EXE=%PYTHON_EXE%"

echo Checking Python dependencies...
"%PYTHON_EXE%" -c "import webview, openpyxl" 2>nul
if %errorlevel% neq 0 (
    echo Installing required packages...
    "%PYTHON_EXE%" -m pip install -r requirements.txt
)

echo Starting Parcel Tracker Desktop App...
start "" "%PYTHONW_EXE%" app.py
exit
