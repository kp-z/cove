#!/bin/bash

# Cove Development Script - Unified start/stop/restart
# Usage: ./dev.sh [start|stop|restart|status|logs]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/cloud/backend"
FRONTEND_DIR="$PROJECT_ROOT/cloud/frontend"
LOCAL_DIR="$PROJECT_ROOT/local"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/.logs"

# Ports
BACKEND_PORT=3002
FRONTEND_PORT=5174
# LOCAL_PORT is dynamic, not fixed

# Create directories
mkdir -p "$PID_DIR" "$LOG_DIR"

# Helper functions
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

# Kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)

    if [ -n "$pids" ]; then
        print_warning "Killing processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Stop all services
stop_all() {
    print_info "Stopping all services..."

    # Kill by port (more reliable than PID files)
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT

    # Clean up PID files
    rm -f "$PID_DIR"/*.pid

    print_success "All services stopped"
}

# Start backend
start_backend() {
    print_info "Starting backend on port $BACKEND_PORT..."

    cd "$BACKEND_DIR"

    # Check dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing backend dependencies..."
        npm install
    fi

    # Run database migrations
    print_info "Running database migrations..."
    npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss

    # Start backend
    nohup npm run dev > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"

    print_success "Backend started (PID: $!)"
}

# Start frontend
start_frontend() {
    print_info "Starting frontend on port $FRONTEND_PORT..."

    cd "$FRONTEND_DIR"

    # Check dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies..."
        npm install
    fi

    # Start frontend
    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"

    print_success "Frontend started (PID: $!)"
}

# Start local agent
start_local() {
    print_info "Starting local agent..."

    cd "$LOCAL_DIR"

    # Check dependencies
    if [ ! -d "node_modules" ]; then
        print_info "Installing local agent dependencies..."
        npm install
    fi

    # Start local agent
    nohup npm run dev > "$LOG_DIR/local.log" 2>&1 &
    echo $! > "$PID_DIR/local.pid"

    print_success "Local agent started (PID: $!)"
}

# Show status
show_status() {
    echo ""
    echo "=== Cove Development Status ==="
    echo ""

    # Check backend
    if lsof -i:$BACKEND_PORT -sTCP:LISTEN >/dev/null 2>&1; then
        local pid=$(lsof -ti:$BACKEND_PORT 2>/dev/null | head -1)
        print_success "Backend: Running (PID: $pid, Port: $BACKEND_PORT)"
        echo "  URL: http://localhost:$BACKEND_PORT"
    else
        print_error "Backend: Not running"
    fi

    # Check frontend
    if lsof -i:$FRONTEND_PORT -sTCP:LISTEN >/dev/null 2>&1; then
        local pid=$(lsof -ti:$FRONTEND_PORT 2>/dev/null | head -1)
        print_success "Frontend: Running (PID: $pid, Port: $FRONTEND_PORT)"
        echo "  URL: http://localhost:$FRONTEND_PORT"
    else
        print_error "Frontend: Not running"
    fi

    # Check local agent
    if [ -f "$PID_DIR/local.pid" ]; then
        local pid=$(cat "$PID_DIR/local.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_success "Local Agent: Running (PID: $pid)"
            echo "  (No fixed port - check log for details)"
        else
            print_error "Local Agent: Not running"
        fi
    else
        print_error "Local Agent: Not running"
    fi

    echo ""
    echo "Logs:"
    echo "  Backend:  $LOG_DIR/backend.log"
    echo "  Frontend: $LOG_DIR/frontend.log"
    echo "  Local:    $LOG_DIR/local.log"
    echo ""
}

# Tail logs
tail_logs() {
    print_info "Tailing logs (Ctrl+C to stop)..."
    tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" "$LOG_DIR/local.log" 2>/dev/null
}

# Main command handler
case "${1:-start}" in
    start)
        print_info "Starting Cove development environment..."
        stop_all  # Clean stop first
        sleep 1
        start_backend
        sleep 3
        start_frontend
        sleep 2
        start_local
        sleep 2
        show_status
        ;;

    stop)
        stop_all
        show_status
        ;;

    restart)
        print_info "Restarting Cove development environment..."
        stop_all
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
        echo "  start   - Start backend, frontend, and local agent"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  status  - Show service status"
        echo "  logs    - Tail all logs"
        exit 1
        ;;
esac
