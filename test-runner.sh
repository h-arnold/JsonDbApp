#!/bin/bash
# filepath: /workspaces/GAS-DB/test-runner.sh

# GAS DB Test Runner Script
# Pushes code to Google Apps Script and runs tests, then retrieves logs

set -e  # Exit on any error

# Configuration
SCRIPT_NAME="GAS DB Test Runner"
LOG_FILE="test-execution.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

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

print_header() {
    echo -e "\n${BLUE}=================================="
    echo -e "$1"
    echo -e "==================================${NC}\n"
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

# Function to check if clasp is installed and authenticated
check_clasp_setup() {
    print_info "Checking clasp setup..."
    
    if ! command -v clasp &> /dev/null; then
        print_error "clasp is not installed. Please install with: npm install -g @google/clasp"
        exit 1
    fi
    
    if ! clasp status &> /dev/null; then
        print_error "clasp is not authenticated or project not configured"
        print_info "Please run: clasp login"
        print_info "And ensure clasp.json contains valid scriptId"
        exit 1
    fi
    
    print_success "clasp setup verified"
}

# Function to push code to Google Apps Script
push_code() {
    print_info "Pushing code to Google Apps Script..."
    
    if clasp push --force 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Code pushed successfully"
        return 0
    else
        print_error "Failed to push code to Google Apps Script"
        return 1
    fi
}

# Function to run tests remotely
run_tests() {
    print_info "Executing tests remotely..."
    
    # Run the main test function
    if clasp run testSection1 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Test execution completed"
        return 0
    else
        print_warning "Test execution may have failed or timed out"
        print_info "Check logs for details..."
        return 1
    fi
}

# Function to run validation tests
run_validation() {
    print_info "Running environment validation..."
    
    if clasp run validateSection1Setup 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Validation completed"
        return 0
    else
        print_warning "Validation may have failed"
        return 1
    fi
}

# Function to retrieve and display logs
retrieve_logs() {
    print_info "Retrieving execution logs..."
    
    # Get logs from the last execution
    if clasp logs --json 2>/dev/null > logs.json; then
        print_success "Logs retrieved successfully"
        
        # Parse and display logs if jq is available
        if command -v jq &> /dev/null; then
            print_info "Parsing structured logs..."
            cat logs.json | jq -r '.[] | "\(.timestamp) [\(.level)] \(.message)"' 2>/dev/null || {
                print_warning "Could not parse JSON logs, showing raw output"
                cat logs.json
            }
        else
            print_warning "jq not available, showing raw JSON logs"
            cat logs.json
        fi
        
        # Clean up temporary file
        rm -f logs.json
    else
        print_warning "Could not retrieve structured logs, trying plain text..."
        clasp logs 2>&1 | tee -a "$LOG_FILE" || {
            print_error "Failed to retrieve any logs"
            return 1
        }
    fi
}

# Function to show help
show_help() {
    echo -e "\n${BLUE}GAS DB Test Runner${NC}"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -v, --validate      Run validation tests only"
    echo "  -t, --tests         Run full test suite only (skip validation)"
    echo "  -p, --push-only     Push code only (no test execution)"
    echo "  -l, --logs-only     Retrieve logs only (no push or execution)"
    echo "  -q, --quiet         Minimal output (errors only)"
    echo "  --no-logs           Skip log retrieval"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full workflow: push, test, retrieve logs"
    echo "  $0 --validate       # Quick validation check"
    echo "  $0 --push-only      # Deploy code without running tests"
    echo "  $0 --logs-only      # Get latest execution logs"
    echo ""
}

# Function to cleanup
cleanup() {
    print_info "Cleaning up temporary files..."
    rm -f logs.json
}

# Set trap for cleanup
trap cleanup EXIT

# Parse command line arguments
VALIDATE_ONLY=false
TESTS_ONLY=false
PUSH_ONLY=false
LOGS_ONLY=false
QUIET=false
NO_LOGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--validate)
            VALIDATE_ONLY=true
            shift
            ;;
        -t|--tests)
            TESTS_ONLY=true
            shift
            ;;
        -p|--push-only)
            PUSH_ONLY=true
            shift
            ;;
        -l|--logs-only)
            LOGS_ONLY=true
            shift
            ;;
        -q|--quiet)
            QUIET=true
            shift
            ;;
        --no-logs)
            NO_LOGS=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Quiet mode setup
if [ "$QUIET" = true ]; then
    exec 1>/dev/null  # Redirect stdout to null, keep stderr for errors
fi

# Main execution
main() {
    if [ "$QUIET" != true ]; then
        print_header "$SCRIPT_NAME - $TIMESTAMP"
    fi
    
    # Initialize log file
    echo "GAS DB Test Execution Log - $TIMESTAMP" > "$LOG_FILE"
    
    # Check clasp setup unless we're only retrieving logs
    if [ "$LOGS_ONLY" != true ]; then
        check_clasp_setup
    fi
    
    # Handle logs-only mode
    if [ "$LOGS_ONLY" = true ]; then
        retrieve_logs
        exit $?
    fi
    
    # Push code unless in logs-only mode
    if [ "$PUSH_ONLY" = true ] || ([ "$VALIDATE_ONLY" != true ] && [ "$TESTS_ONLY" != true ]); then
        if ! push_code; then
            print_error "Code push failed, aborting"
            exit 1
        fi
        
        if [ "$PUSH_ONLY" = true ]; then
            print_success "Code push completed successfully"
            exit 0
        fi
    fi
    
    # Run validation if requested or in full mode
    if [ "$VALIDATE_ONLY" = true ] || ([ "$TESTS_ONLY" != true ] && [ "$PUSH_ONLY" != true ]); then
        print_header "Running Environment Validation"
        run_validation
    fi
    
    # Run tests if requested or in full mode
    if [ "$TESTS_ONLY" = true ] || ([ "$VALIDATE_ONLY" != true ] && [ "$PUSH_ONLY" != true ]); then
        print_header "Running Test Suite"
        run_tests
    fi
    
    # Retrieve logs unless disabled
    if [ "$NO_LOGS" != true ]; then
        print_header "Retrieving Execution Logs"
        retrieve_logs
    fi
    
    if [ "$QUIET" != true ]; then
        print_header "Test Execution Complete"
        print_success "All operations completed"
        print_info "Full log available in: $LOG_FILE"
    fi
}

# Execute main function
main "$@"