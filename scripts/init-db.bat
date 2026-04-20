@echo off
echo === AiNeed Database Initialization ===

cd apps\backend

echo Running migrations...
call npx prisma migrate deploy

echo Running seed...
call npx prisma db seed

echo === Database initialized ===
pause
