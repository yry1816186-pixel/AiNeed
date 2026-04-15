@echo off
echo ========================================
echo   XunO Development Setup
echo ========================================
echo.

echo [1/4] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo [2/4] Generating Prisma Client...
cd /d "%~dp0..\apps\backend"
call npx prisma generate
if %errorlevel% neq 0 (
    echo Failed to generate Prisma Client!
    pause
    exit /b 1
)

echo [3/4] Setting up database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo Failed to setup database!
    pause
    exit /b 1
)

echo [4/4] Seeding database...
call npx prisma db seed
if %errorlevel% neq 0 (
    echo Warning: Database seeding failed. You can run it manually.
)

echo.
echo ========================================
echo   Setup complete!
echo ========================================
pause
