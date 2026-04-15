#!/bin/bash

echo "Starting AI Task Worker..."
echo

# Set environment variables
export REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
export LOG_LEVEL=${LOG_LEVEL:-"INFO"}

# Change to ml directory
cd "$(dirname "$0")/../ml"

# Start the task worker
echo "Starting task worker for all queues..."
python -m services.task_worker --all --redis-url "$REDIS_URL"
