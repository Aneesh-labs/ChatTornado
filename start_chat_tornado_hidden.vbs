Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run Chr(34) & currentDir & "\start_chat_tornado.bat" & Chr(34), 0
Set WshShell = Nothing