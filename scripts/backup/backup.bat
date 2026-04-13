@echo off
REM =============================================================================
REM xuno Backup Script (Windows)
REM =============================================================================
REM This script performs comprehensive backups of:
REM - PostgreSQL database
REM - Redis data
REM - MinIO object storage
REM - Qdrant vector database
REM
REM Usage: backup.bat [OPTIONS]
REM Options:
REM   --full         Perform full backup (default)
REM   --db-only      Backup only databases
REM   --upload       Upload backup to cloud storage (requires S3 credentials)
REM   -h, --help     Show this help message
REM =============================================================================

setlocal enabledelayedexpansion

REM Configuration
if not defined BACKUP_DIR set BACKUP_DIR=C:\backups
for /f "tokens=1-6 delims= " %%a in ('wmic os get localdatetime ^| find "."') do set TIMESTAMP=%%a
set TIMESTAMP=%TIMESTAMP:~0,8%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_NAME=xuno_backup_%TIMESTAMP%
set BACKUP_PATH=%BACKUP_DIR%\%BACKUP_NAME%
set RETENTION_DAYS=30

REM Colors (Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "NC=[0m"

REM Logging functions
:log_info
echo %GREEN%[INFO]%NC% %date% %time% - %*
goto :eof

:log_warn
echo %YELLOW%[WARN]%NC% %date% %time% - %*
goto :eof

:log_error
echo %RED%[ERROR]%NC% %date% %time% - %*
goto :eof

REM Parse arguments
set FULL_BACKUP=1
set DB_ONLY=0
set UPLOAD_TO_S3=0

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--full" set FULL_BACKUP=1 & shift & goto :parse_args
if /i "%~1"=="--db-only" set DB_ONLY=1 & set FULL_BACKUP=0 & shift & goto :parse_args
if /i "%~1"=="--upload" set UPLOAD_TO_S3=1 & shift & goto :parse_args
if /i "%~1"=="-h" goto :show_help
if /i "%~1"=="--help" goto :show_help
shift
goto :parse_args

:show_help
echo Usage: backup.bat [OPTIONS]
echo.
echo Options:
echo   --full         Perform full backup (default)
echo   --db-only      Backup only databases
echo   --upload       Upload backup to cloud storage
echo   -h, --help     Show this help message
exit /b 0

:args_done

REM Create backup directory
if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"
call :log_info Backup directory: %BACKUP_PATH%

REM =============================================================================
REM PostgreSQL Backup
REM =============================================================================
:backup_postgres
call :log_info Starting PostgreSQL backup...

set CONTAINER_NAME=stylemind-postgres
set DB_NAME=stylemind
set BACKUP_FILE=%BACKUP_PATH%\postgres_%TIMESTAMP%.sql.gz

REM Check if container is running
docker ps --format "{{.Names}}" 2>nul | findstr /x "%CONTAINER_NAME%" >nul
if errorlevel 1 (
    call :log_error PostgreSQL container '%CONTAINER_NAME%' is not running
    goto :backup_redis
)

REM Create database backup
docker exec %CONTAINER_NAME% pg_dump -U postgres -d %DB_NAME% --format=plain --no-owner --no-acl 2>nul | gzip > "%BACKUP_FILE%"

if exist "%BACKUP_FILE%" (
    for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
    call :log_info PostgreSQL backup completed: %BACKUP_FILE% (!SIZE! bytes)
) else (
    call :log_error PostgreSQL backup failed
)

REM =============================================================================
REM Redis Backup
REM =============================================================================
:backup_redis
call :log_info Starting Redis backup...

set CONTAINER_NAME=stylemind-redis
set BACKUP_FILE=%BACKUP_PATH%\redis_%TIMESTAMP%.rdb

REM Check if container is running
docker ps --format "{{.Names}}" 2>nul | findstr /x "%CONTAINER_NAME%" >nul
if errorlevel 1 (
    call :log_error Redis container '%CONTAINER_NAME%' is not running
    goto :backup_minio
)

REM Trigger BGSAVE
docker exec %CONTAINER_NAME% redis-cli -a %REDIS_PASSWORD% BGSAVE >nul 2>&1
timeout /t 5 /nobreak >nul

REM Copy RDB file
docker cp %CONTAINER_NAME%:/data/dump.rdb "%BACKUP_FILE%" >nul 2>&1

if exist "%BACKUP_FILE%" (
    for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
    call :log_info Redis backup completed: %BACKUP_FILE% (!SIZE! bytes)
) else (
    call :log_error Redis backup failed
)

REM =============================================================================
REM MinIO Backup
REM =============================================================================
:backup_minio
if %DB_ONLY%==1 (
    call :log_info Skipping MinIO backup (--db-only mode)
    goto :backup_qdrant
)

call :log_info Starting MinIO backup...

set CONTAINER_NAME=stylemind-minio
set BACKUP_FILE=%BACKUP_PATH%\minio_%TIMESTAMP%.tar.gz
set TEMP_DIR=%BACKUP_PATH%\minio_temp

REM Check if container is running
docker ps --format "{{.Names}}" 2>nul | findstr /x "%CONTAINER_NAME%" >nul
if errorlevel 1 (
    call :log_error MinIO container '%CONTAINER_NAME%' is not running
    goto :backup_qdrant
)

REM Create temp directory
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Copy data from container
docker cp %CONTAINER_NAME%:/data "%TEMP_DIR%\" >nul 2>&1

REM Create compressed archive (using 7-Zip if available, otherwise tar)
where 7z >nul 2>&1
if errorlevel 1 (
    tar -czf "%BACKUP_FILE%" -C "%TEMP_DIR%" data 2>nul
) else (
    7z a -tgzip "%BACKUP_FILE%" "%TEMP_DIR%\data" >nul 2>&1
)

REM Cleanup
rd /s /q "%TEMP_DIR%" 2>nul

if exist "%BACKUP_FILE%" (
    for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
    call :log_info MinIO backup completed: %BACKUP_FILE% (!SIZE! bytes)
) else (
    call :log_error MinIO backup failed
)

REM =============================================================================
REM Qdrant Backup
REM =============================================================================
:backup_qdrant
if %DB_ONLY%==1 (
    call :log_info Skipping Qdrant backup (--db-only mode)
    goto :cleanup
)

call :log_info Starting Qdrant backup...

set CONTAINER_NAME=stylemind-qdrant
set BACKUP_FILE=%BACKUP_PATH%\qdrant_%TIMESTAMP%.tar.gz
set TEMP_DIR=%BACKUP_PATH%\qdrant_temp

REM Check if container is running
docker ps --format "{{.Names}}" 2>nul | findstr /x "%CONTAINER_NAME%" >nul
if errorlevel 1 (
    call :log_error Qdrant container '%CONTAINER_NAME%' is not running
    goto :cleanup
)

REM Create temp directory
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Copy data from container
docker cp %CONTAINER_NAME%:/qdrant/storage "%TEMP_DIR%\" >nul 2>&1

REM Create compressed archive
where 7z >nul 2>&1
if errorlevel 1 (
    tar -czf "%BACKUP_FILE%" -C "%TEMP_DIR%" storage 2>nul
) else (
    7z a -tgzip "%BACKUP_FILE%" "%TEMP_DIR%\storage" >nul 2>&1
)

REM Cleanup
rd /s /q "%TEMP_DIR%" 2>nul

if exist "%BACKUP_FILE%" (
    for %%A in ("%BACKUP_FILE%") do set SIZE=%%~zA
    call :log_info Qdrant backup completed: %BACKUP_FILE% (!SIZE! bytes)
) else (
    call :log_error Qdrant backup failed
)

REM =============================================================================
REM Cleanup Old Backups
REM =============================================================================
:cleanup
call :log_info Cleaning up backups older than %RETENTION_DAYS% days...

set DELETED_COUNT=0
forfiles /p "%BACKUP_DIR%" /m "xuno_backup_*" /d -%RETENTION_DAYS% /c "cmd /c if @isdir==TRUE rd /s /q @path & set /a DELETED_COUNT+=1" 2>nul

call :log_info Cleanup completed

REM =============================================================================
REM Summary
REM =============================================================================
:summary
call :log_info ==========================================
call :log_info Backup Summary
call :log_info ==========================================
call :log_info Backup location: %BACKUP_PATH%
call :log_info Backup completed!

endlocal
