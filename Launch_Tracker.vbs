Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

Dim localAppData
localAppData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")

candidatesW = Array( _
    localAppData & "\Microsoft\WindowsApps\pythonw.exe", _
    localAppData & "\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\pythonw.exe", _
    localAppData & "\Programs\Python\Python311\pythonw.exe", _
    localAppData & "\Programs\Python\Python312\pythonw.exe", _
    "pythonw.exe" _
)

candidatesP = Array( _
    localAppData & "\Microsoft\WindowsApps\python.exe", _
    localAppData & "\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe", _
    localAppData & "\Programs\Python\Python311\python.exe", _
    localAppData & "\Programs\Python\Python312\python.exe", _
    "python.exe" _
)

pythonwExe = ""
For Each p In candidatesW
    If FSO.FileExists(p) Then
        pythonwExe = p
        Exit For
    End If
Next

pythonExe = ""
For Each p In candidatesP
    If FSO.FileExists(p) Then
        pythonExe = p
        Exit For
    End If
Next

If pythonwExe = "" Then pythonwExe = pythonExe
If pythonExe = "" Then pythonExe = "python.exe"
If pythonwExe = "" Then pythonwExe = "pythonw.exe"

' Check dependencies silently
WshShell.Run "cmd /c cd /d """ & strPath & """ && """ & pythonExe & """ -c ""import webview, openpyxl"" 2>nul || """ & pythonExe & """ -m pip install -r requirements.txt", 0, True

' Launch the app with pythonw
WshShell.Run """" & pythonwExe & """ """ & strPath & "\app.py""", 1, False
