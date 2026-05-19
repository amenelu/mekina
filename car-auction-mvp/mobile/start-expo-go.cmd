@echo off
title Mekina Expo QR
set EXPO_NO_DEPENDENCY_VALIDATION=true
set EXPO_PUBLIC_API_URL=http://192.168.100.9:8083
cd /d "%~dp0"
call node_modules\.bin\expo.cmd start --go --lan --port 8081
