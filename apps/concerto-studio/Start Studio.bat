@echo off
rem Concerto Configuration Studio launcher.
rem Serves the Labs repository root (read-only static files) so the app can
rem fetch ../../model/*.json — the canonical models — without copying them.
cd /d "%~dp0..\.."
start "" "http://localhost:8600/apps/concerto-studio/"
python -m http.server 8600
