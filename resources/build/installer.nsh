!macro customHeader
  !system "echo ''"
!macroend

!macro customInit
  ; Check for and remove old Vlinder v1 data
  IfFileExists "$APPDATA\Vlinder\*.*" 0 +4
    MessageBox MB_YESNO|MB_ICONQUESTION "An older version of Vlinder was detected at $APPDATA\Vlinder.$\n$\nWould you like to remove the old data for a clean install? (Recommended)" IDNO skip_cleanup
    RMDir /r "$APPDATA\Vlinder"
    skip_cleanup:

  ; Also check for old Vlinder installs in common locations
  IfFileExists "$LOCALAPPDATA\Programs\Vlinder\*.*" 0 +2
    RMDir /r "$LOCALAPPDATA\Programs\Vlinder"

  IfFileExists "$LOCALAPPDATA\vlinder-updater\*.*" 0 +2
    RMDir /r "$LOCALAPPDATA\vlinder-updater"
!macroend

!macro customInstall
  ; Register Vlinder as a browser for Windows Default Apps
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder" "" "Vlinder"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\DefaultIcon" "" "$INSTDIR\Vlinder.exe,0"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\shell\open\command" "" '"$INSTDIR\Vlinder.exe"'
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\Capabilities" "ApplicationName" "Vlinder"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\Capabilities" "ApplicationDescription" "Privacy-focused web browser with built-in ad blocker and Tor proxy"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\Capabilities" "ApplicationIcon" "$INSTDIR\Vlinder.exe,0"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\Capabilities\URLAssociations" "http" "VlinderURL"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\Capabilities\URLAssociations" "https" "VlinderURL"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\Capabilities\FileAssociations" ".html" "VlinderFile"
  WriteRegStr SHCTX "Software\Clients\StartMenuInternet\Vlinder\Capabilities\FileAssociations" ".htm" "VlinderFile"
  WriteRegStr SHCTX "Software\RegisteredApplications" "Vlinder" "Software\Clients\StartMenuInternet\Vlinder\Capabilities"

  ; URL handler
  WriteRegStr SHCTX "Software\Classes\VlinderURL" "" "Vlinder URL"
  WriteRegStr SHCTX "Software\Classes\VlinderURL" "URL Protocol" ""
  WriteRegStr SHCTX "Software\Classes\VlinderURL\DefaultIcon" "" "$INSTDIR\Vlinder.exe,0"
  WriteRegStr SHCTX "Software\Classes\VlinderURL\shell\open\command" "" '"$INSTDIR\Vlinder.exe" "%1"'

  ; File handler
  WriteRegStr SHCTX "Software\Classes\VlinderFile" "" "Vlinder HTML Document"
  WriteRegStr SHCTX "Software\Classes\VlinderFile\DefaultIcon" "" "$INSTDIR\Vlinder.exe,0"
  WriteRegStr SHCTX "Software\Classes\VlinderFile\shell\open\command" "" '"$INSTDIR\Vlinder.exe" "%1"'
!macroend

!macro customUnInstall
  ; Clean up browser registration
  DeleteRegKey SHCTX "Software\Clients\StartMenuInternet\Vlinder"
  DeleteRegValue SHCTX "Software\RegisteredApplications" "Vlinder"
  DeleteRegKey SHCTX "Software\Classes\VlinderURL"
  DeleteRegKey SHCTX "Software\Classes\VlinderFile"

  ; Remove app data
  RMDir /r "$APPDATA\Vlinder"
  RMDir /r "$APPDATA\vlinder"
  RMDir /r "$LOCALAPPDATA\vlinder-updater"
!macroend
