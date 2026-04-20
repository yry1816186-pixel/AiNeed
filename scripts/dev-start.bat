@echo off
echo === AiNeed Dev Environment (Windows) ===

echo Starting infrastructure...
docker compose -f docker-compose.dev.yml up -d postgres redis minio qdrant

echo Waiting for PostgreSQL...
timeout /t 5 /nobreak > nul

echo Running migrations...
cd apps\backend
call npx prisma migrate dev
cd ..\..

echo Starting backend...
start "AiNeed Backend" cmd /c "pnpm --filter backend dev"

echo Starting admin...
start "AiNeed Admin" cmd /c "pnpm --filter admin dev"

echo Starting mobile...
cd apps\mobile
call npx expo start

echo === All services starting ===
