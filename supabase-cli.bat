@echo off
REM Supabase CLI Helper Script for Windows
REM Usage: supabase-cli.bat <command> [args]
REM Example: supabase-cli.bat db push
REM Example: supabase-cli.bat migration new add_user_preferences

REM Load access token from .env.local
for /f "tokens=2 delims==" %%a in ('findstr SUPABASE_ACCESS_TOKEN .env.local') do set SUPABASE_ACCESS_TOKEN=%%a

REM Run supabase command with all arguments
npx supabase %*
