@echo off
title WingMan Launcher (Auto-Restart)

REM ============================================================
REM KILL OLD PROCESSES
REM ============================================================
echo Cleaning up old WingMan processes...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM electron.exe /F >nul 2>&1
echo Cleanup complete.
echo.

REM ============================================================
REM START BACKEND (AUTO-RESTART)
REM ============================================================
echo Starting WingMan backend...
cd /d C:\WingManBackend\WingManBackend
start "WingMan Backend" cmd /k node server.cjs
echo Backend launched.
echo.

REM ============================================================
REM START VITE RENDERER (AUTO-RESTART)
REM ============================================================
echo Starting WingMan Renderer (Vite)...
cd /d C:\WingMan\projects\Electron
start "WingMan Renderer" cmd /k npm run dev
echo Renderer launched.
echo.

REM ============================================================
REM WAIT FOR BACKEND + VITE TO INITIALIZE
REM ============================================================
echo Waiting for backend and renderer to initialize...
timeout /t 4 >nul
echo.

REM ============================================================
REM START ELECTRON (AUTO-RESTART)
REM ============================================================
echo Starting WingMan Electron App...
cd /d C:\WingMan\projects\Electron
echo ELECTRON IS RUNNING FROM: %CD%
start "WingMan Electron" cmd /k npx electron .
echo Electron main process launched.
echo.

REM ============================================================
REM IMPORTANT:
REM Do NOT open the browser. Electron will load the correct URL.
REM ============================================================
echo WingMan is launching inside Electron.
echo Close this window if you want to stop all WingMan processes.
