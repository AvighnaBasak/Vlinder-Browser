@echo off
title Vlinder Unregistration Script
echo ============================================
echo   Removing Vlinder registration from system
echo ============================================
echo.

rem --- Delete Vlinder custom file/URL handlers ---
reg delete "HKCU\Software\Classes\unifeedFile" /f >nul 2>&1
reg delete "HKCU\Software\Classes\unifeedURL" /f >nul 2>&1

rem --- Delete Vlinder StartMenuInternet registration ---
reg delete "HKCU\Software\Clients\StartMenuInternet\vlinder" /f >nul 2>&1

rem --- Delete Vlinder RegisteredApplications entry ---
reg delete "HKCU\Software\RegisteredApplications" /v "vlinder" /f >nul 2>&1

rem --- Delete any other Vlinder keys the app may have stored ---
reg delete "HKCU\Software\Vlinder" /f >nul 2>&1

rem --- Optional: Remove user-level URL associations pointing to Vlinder ---
for %%P in (http https) do (
    reg query "HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\%%P\UserChoice" /v ProgId 2>nul | find /i "vlinder" >nul
    if !errorlevel! == 0 (
        echo Resetting %%P association (was Vlinder)
        reg delete "HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\%%P\UserChoice" /f >nul 2>&1
    )
)

echo.
echo ✅ Vlinder has been completely unregistered.
echo If it still appears in "Default Apps", restart your PC.
echo.
pause
exit /b
