Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
logDir = root & "\workspace-data\logs"

If Not fso.FolderExists(root & "\workspace-data") Then
  fso.CreateFolder(root & "\workspace-data")
End If

If Not fso.FolderExists(logDir) Then
  fso.CreateFolder(logDir)
End If

command = "cmd.exe /d /c ""cd /d " & Chr(34) & root & Chr(34) & " && node.exe server.js > " & Chr(34) & logDir & "\management-server.out.log" & Chr(34) & " 2> " & Chr(34) & logDir & "\management-server.err.log" & Chr(34) & """"

shell.Run command, 0, False
WScript.Sleep 8000
