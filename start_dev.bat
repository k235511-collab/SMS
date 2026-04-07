@echo off
echo Starting SMS SaaS...
cd /d "%~dp0"
call pnpm install
call pnpm dev
pause
