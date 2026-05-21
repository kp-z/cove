#!/bin/bash

# Cove Development Environment Startup Script
# Usage: ./dev-start.sh [start|restart|stop|status]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLOUD_BACKEND_DIR="$PROJECT_ROOT/cloud/backend"
CLOUD_FRONTEND_DIR="$PROJECT_ROOT/cloud/frontend"
LOCAL_DIR="$PROJECT_ROOT/local"

# PID files
PID_DIR="$PROJECT_ROOT/.pids"
BACKEND_PID="$PID_DIR/backend.pid"
FRONTEND_PID="$PID_DIR/frontend.pid"
LOCAL_PID="$PID_DIR/local.pid"

# Log files
LOG_DIR="$PROJECT_ROOT/.logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
LOCAL_LOG="$LOG_DIR/local.log"

# Service ports
BACKEND_PORT=3002
FRONTEND_PORT=5174
# LOCAL_PORT is not fixed, so we don't check it

# Create directories if they don't exist
mkdir -p "$PID_DIR"
mkdir -p "$LOG_DIR"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use and kill the process
check_and_kill_port() {
    local port=$1
    local service_name=$2

    # Check if port is in use
    local pid=$(lsof -ti:$port 2>/dev/null)

    if [ -n "$pid" ]; then
        print_warning "Port $port is already in use by process $pid"
        print_info "Killing process $pid to free port $port for $service_name..."
        kill "$pid" 2>/dev/null || true

        # Wait for process to stop (max 5 seconds)
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 5 ]; do
            sleep 1
            count=$((count + 1))
        done

        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Force killing process $pid..."
            kill -9 "$pid" 2>/dev/null || true
        fi

        print_success "Port $port freed for $service_name"
    fi
}

# Function to check if a process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# Function to stop a process
stop_process() {
    local name=$1
    local pid_file=$2

    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        print_info "Stopping $name (PID: $pid)..."
        kill "$pid" 2>/dev/null || true

        # Wait for process to stop (max 10 seconds)
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done

        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Force killing $name..."
            kill -9 "$pid" 2>/dev/null || true
        fi

        rm -f "$pid_file"
        print_success "$name stopped"
    else
        print_info "$name is not running"
    fi
}

# Function to start cloud backend
start_backend() {
    if is_running "$BACKEND_PID"; then
        print_warning "Cloud Backend is already running (PID: $(cat $BACKEND_PID))"
        return
    fi

    # Check and free port if needed
    check_and_kill_port "$BACKEND_PORT" "Cloud Backend"

    print_info "Starting Cloud Backend..."
    cd "$CLOUD_BACKEND_DIR"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing backend dependencies..."
        npm install
    fi

    # Start backend in background
    nohup npm run dev > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID"

    print_success "Cloud Backend started (PID: $!, Log: $BACKEND_LOG)"
}

# Function to start cloud frontend
start_frontend() {
    if is_running "$FRONTEND_PID"; then
        print_warning "Cloud Frontend is already running (PID: $(cat $FRONTEND_PID))"
        return
    fi

    # Check and free port if needed
    check_and_kill_port "$FRONTEND_PORT" "Cloud Frontend"

    print_info "Starting Cloud Frontend..."
    cd "$CLOUD_FRONTEND_DIR"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    fi

    # Start frontend in background
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID"

    print_success "Cloud Frontend started (PID: $!, Log: $FRONTEND_LOG)"
}

# Function to start local agent
start_local() {
    if is_running "$LOCAL_PID"; then
        print_warning "Local Agent is already running (PID: $(cat $LOCAL_PID))"
        return
    fi

    print_info "Starting Local Agent..."
    cd "$LOCAL_DIR"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing local agent dependencies..."
        npm install
    fi

    # Start local agent in background
    nohup npm run dev > "$LOCAL_LOG" 2>&1 &
    echo $! > "$LOCAL_PID"

    print_success "Local Agent started (PID: $!, Log: $LOCAL_LOG)"
}

# Function to show status
show_status() {
    echo ""
    echo "=== Cove Development Environment Status ==="
    echo ""

    if is_running "$BACKEND_PID"; then
        print_success "Cloud Backend: Running (PID: $(cat $BACKEND_PID))"
        echo "  URL: http://localhost:$BACKEND_PORT"
    else
        print_error "Cloud Backend: Stopped"
    fi

    if is_running "$FRONTEND_PID"; then
        print_success "Cloud Frontend: Running (PID: $(cat $FRONTEND_PID))"
        echo "  URL: http://localhost:$FRONTEND_PORT"
    else
        print_error "Cloud Frontend: Stopped"
    fi

    if is_running "$LOCAL_PID"; then
        print_success "Local Agent: Running (PID: $(cat $LOCAL_PID))"
        echo "  (No fixed port - check log for details)"
    else
        print_error "Local Agent: Stopped"
    fi

    echo ""
    echo "Log files:"
    echo "  Backend:  $BACKEND_LOG"
    echo "  Frontend: $FRONTEND_LOG"
    echo "  Local:    $LOCAL_LOG"
    echo ""
}

# Function to tail logs
tail_logs() {
    print_info "Tailing logs (Ctrl+C to stop)..."
    tail -f "$BACKEND_LOG" "$FRONTEND_LOG" "$LOCAL_LOG" 2>/dev/null
}

# Main script logic
case "${1:-start}" in
    start)
        print_info "Starting Cove development environment..."
        start_backend
        sleep 2
        start_frontend
        sleep 2
        start_local
        echo ""
        show_status
        echo ""
        print_info "To view logs, run: $0 logs"
        ;;

    stop)
        print_info "Stopping Cove development environment..."
        stop_process "Cloud Backend" "$BACKEND_PID"
        stop_process "Cloud Frontend" "$FRONTEND_PID"
        stop_process "Local Agent" "$LOCAL_PID"
        show_status
        ;;

    restart)
        print_info "Restarting Cove development environment..."
        $0 stop
        sleep 2
        $0 start
        ;;

    status)
        show_status
        ;;

    logs)
        tail_logs
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  status  - Show service status"
        echo "  logs    - Tail all logs"
        exit 1
        ;;
esac
