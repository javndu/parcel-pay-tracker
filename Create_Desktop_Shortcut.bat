@echo off
set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%_create_shortcut.vbs"
set APP_DIR=%~dp0
set TARGET_VBS=%APP_DIR%Launch_Tracker.vbs

echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Australia Post Parcel Tracker.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "wscript.exe" >> %SCRIPT%
echo oLink.Arguments = """" ^& "%TARGET_VBS%" ^& """" >> %SCRIPT%
echo oLink.WorkingDirectory = "%APP_DIR%" >> %SCRIPT%
echo oLink.Description = "Australia Post Delivery Manifest & Pay Tracker" >> %SCRIPT%
echo oLink.IconLocation = "%APP_DIR%app_icon.ico,0" >> %SCRIPT%
echo oLink.WindowStyle = 1 >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript /nologo %SCRIPT%
del %SCRIPT%

echo Shortcut created on your Desktop: "Australia Post Parcel Tracker"
pause
