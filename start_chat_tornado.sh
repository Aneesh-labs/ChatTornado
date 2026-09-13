#!/usr/bin/env bash
# ChatTornado Launcher for Linux / macOS

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=========================================="
echo "        Starting ChatTornado..."
echo "=========================================="

# Start FastAPI Backend in background
echo "Starting Backend..."
(
    cd "$SCRIPT_DIR/backend" || exit 1
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

# Start React Frontend
echo "Starting Frontend..."
(
    cd "$SCRIPT_DIR" || exit 1
    npm run dev -- --host
) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM

wait
