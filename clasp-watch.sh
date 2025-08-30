#!/bin/bash
# filepath: /workspaces/JsonDbApp/clasp-watch.sh

# Clasp Watch Manager Script
# Checks authentication, logs in if needed, and starts clasp watch

set -e  # Exit on any error

# Configuration
SCRIPT_NAME="Clasp Watch Manager"
WATCH_PID_FILE=".clasp-watch.pid"

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

# Function to print coloured output
print_status() {
    local colour=$1
    local message=$2
    echo -e "${colour}[$(date '+%H:%M:%S')] ${message}${NC}"
}

print_success() {
    print_status "$GREEN" "✓ $1"
}

print_error() {
    print_status "$RED" "✗ $1"
}

print_warning() {
    print_status "$YELLOW" "⚠ $1"
}

print_info() {
    print_status "$BLUE" "ℹ $1"
}

# Function to check if clasp is installed
check_clasp_installed() {
    if ! command -v clasp &> /dev/null; then
        print_error "clasp is not installed. Please install with: npm install -g @google/clasp"
        exit 1
    fi
    print_success "clasp is installed"
}

# Function to check if project is configured
check_project_configured() {
    if [ ! -f ".clasp.json" ]; then
        print_error ".clasp.json not found. Your project is not configured with clasp."
        print_info "Please run 'clasp create --title <YourProjectTitle>' or 'clasp clone <scriptId>' to set up your project."
        exit 1
    fi
    print_success "Project is configured (.clasp.json found)"
}

# Function to check authentication status
check_auth_status() {
    print_info "Checking clasp authentication status..."
    
    # Try to get user info to check if authenticated
    if clasp list 2>/dev/null | grep -q "scriptId" || clasp list >/dev/null 2>&1; then
        print_success "Already authenticated with clasp"
        return 0
    else
        print_warning "Not authenticated with clasp"
        return 1
    fi
}

# Function to perform login
perform_login() {
    print_info "Attempting to log in to clasp..."
    
    if clasp login --no-localhost; then
        print_success "Successfully logged in to clasp"
        return 0
    else
        print_error "Failed to log in to clasp"
        print_info "Please ensure you complete the authentication process in your browser"
        exit 1
    fi
}

# Function to check if clasp watch is already running
check_watch_running() {
    if [ -f "$WATCH_PID_FILE" ]; then
        local pid=$(cat "$WATCH_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "clasp watch is already running (PID: $pid)"
            print_info "Use 'kill $pid' to stop it, or run this script with --stop"
            return 0
        else
            # PID file exists but process is not running, clean up
            rm -f "$WATCH_PID_FILE"
        fi
    fi
    return 1
}

# Function to start clasp watch
start_watch() {
    print_info "Starting clasp push --watch in the background..."
    
    # Start clasp push --watch in background and capture PID
    nohup clasp push --watch > clasp-watch.log 2>&1 &
    local watch_pid=$!
    
    # Save PID to file
    echo "$watch_pid" > "$WATCH_PID_FILE"
    
    # Give it a moment to start
    sleep 2
    
    # Check if the process is still running
    if ps -p "$watch_pid" > /dev/null 2>&1; then
        print_success "clasp watch started successfully (PID: $watch_pid)"
        print_info "Logs are being written to: clasp-watch.log"
        print_info "To stop: kill $watch_pid or run this script with --stop"
    else
        print_error "clasp watch failed to start"
        rm -f "$WATCH_PID_FILE"
        exit 1
    fi
}

# Function to stop clasp watch
stop_watch() {
    if [ -f "$WATCH_PID_FILE" ]; then
        local pid=$(cat "$WATCH_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_info "Stopping clasp watch (PID: $pid)..."
            kill "$pid"
            rm -f "$WATCH_PID_FILE"
            print_success "clasp watch stopped"
        else
            print_warning "clasp watch process not found, cleaning up PID file"
            rm -f "$WATCH_PID_FILE"
        fi
    else
        print_warning "No clasp watch PID file found"
    fi
}

# Function to show help
show_help() {
    echo -e "\n${BLUE}Clasp Watch Manager${NC}"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -s, --stop          Stop running clasp watch"
    echo "  -r, --restart       Restart clasp watch"
    echo "  --status            Show clasp watch status"
    echo ""
    echo "Examples:"
    echo "  $0                  # Start clasp watch (login if needed)"
    echo "  $0 --stop           # Stop clasp watch"
    echo "  $0 --restart        # Restart clasp watch"
    echo "  $0 --status         # Check if clasp watch is running"
    echo ""
}

# Function to show status
show_status() {
    if [ -f "$WATCH_PID_FILE" ]; then
        local pid=$(cat "$WATCH_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_success "clasp watch is running (PID: $pid)"
            print_info "Log file: clasp-watch.log"
        else
            print_warning "PID file exists but process is not running"
            print_info "Run with --restart to clean up and restart"
        fi
    else
        print_info "clasp watch is not running"
    fi
}

# Function for cleanup
cleanup() {
    # Clean up any temporary files if needed
    :
}

# Set trap for cleanup
trap cleanup EXIT

# Parse command line arguments
STOP_WATCH=false
RESTART_WATCH=false
SHOW_STATUS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--stop)
            STOP_WATCH=true
            shift
            ;;
        -r|--restart)
            RESTART_WATCH=true
            shift
            ;;
        --status)
            SHOW_STATUS=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_info "$SCRIPT_NAME started"
    
    # Handle status check
    if [ "$SHOW_STATUS" = true ]; then
        show_status
        exit 0
    fi
    
    # Handle stop request
    if [ "$STOP_WATCH" = true ]; then
        stop_watch
        exit 0
    fi
    
    # Handle restart request
    if [ "$RESTART_WATCH" = true ]; then
        print_info "Restarting clasp watch..."
        stop_watch
        sleep 1
    fi
    
    # Check prerequisites
    check_clasp_installed
    check_project_configured
    
    # Check if watch is already running (unless restarting)
    if [ "$RESTART_WATCH" != true ] && check_watch_running; then
        exit 0
    fi
    
    # Check authentication and login if needed
    if ! check_auth_status; then
        perform_login
    fi
    
    # Start clasp watch
    start_watch
    
    print_success "Setup complete!"
}

# Execute main function
main "$@"
