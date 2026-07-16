!macro customInstall
  WriteRegStr HKCU "Software\Classes\highlightstudio" "" "URL:highlightstudio"
  WriteRegStr HKCU "Software\Classes\highlightstudio" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\highlightstudio\DefaultIcon" "" "$INSTDIR\Highlight Studio.exe,0"
  WriteRegStr HKCU "Software\Classes\highlightstudio\shell\open\command" "" '"$INSTDIR\Highlight Studio.exe" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\highlightstudio"
!macroend
