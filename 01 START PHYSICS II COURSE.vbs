Option Explicit

Dim shell, files, root, course, choice
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")

root = files.GetParentFolderName(WScript.ScriptFullName)
course = root & "\course_files\index.html"

If Not files.FileExists(course) Then
    MsgBox "The course file was not found:" & vbCrLf & course, 16, "Physics II"
    WScript.Quit
End If

choice = MsgBox("Open the Physics II course with your default browser?" & vbCrLf & vbCrLf & "Yes = Open normally" & vbCrLf & "No = Choose an app" & vbCrLf & "Cancel = Stop", 35, "Physics II")

If choice = 6 Then
    shell.Run "rundll32.exe url.dll,FileProtocolHandler " & Chr(34) & course & Chr(34), 1, False
ElseIf choice = 7 Then
    shell.Run "rundll32.exe shell32.dll,OpenAs_RunDLL " & Chr(34) & course & Chr(34), 1, False
Else
    WScript.Quit
End If
