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

# Function to check clasp setup
check_clasp_setup() {
    print_info "Checking clasp setup..."
    
    if ! command -v clasp &> /dev/null; then
        print_error "clasp is not installed. Please install with: npm install -g @google/clasp"
        exit 1
    fi
    
    # Check if clasp is authenticated and project is configured
    if ! clasp status &> /dev/null; then
        print_error "clasp is not authenticated or project not configured"
        print_info "Authentication required. Please run the following commands:"
        print_info "1. clasp login"
        print_info "2. clasp login --user <your-email> --use-project-scopes --creds .gas-testing.json"
        print_info "Then ensure clasp.json contains valid scriptId"
        
        # Check if we can detect which step is needed
        if clasp whoami &> /dev/null; then
            print_warning "Basic authentication exists but project-specific auth may be needed"
            print_info "Try running: clasp login --user <your-email> --use-project-scopes --creds .gas-testing.json"
        else
            print_warning "No authentication detected"
            print_info "Start with: clasp login"
        fi
        
        exit 1
    fi
    
    print_success "clasp setup verified"
}

# Function to check if tests ran successfully by examining logs
check_test_success_in_logs() {
    # Look for test completion indicators in recent logs
    if clasp logs --json 2>/dev/null | grep -q "Tests.*Passed.*Failed.*Pass Rate" || \
       clasp logs 2>/dev/null | grep -q "Tests.*Passed.*Failed.*Pass Rate"; then
        return 0
    fi
    return 1
}

# Function to check if validation ran successfully by examining logs  
check_validation_success_in_logs() {
    # Look for validation completion indicators in recent logs
    if clasp logs --json 2>/dev/null | grep -q "components validated successfully" || \
       clasp logs 2>/dev/null | grep -q "validation.*PASS\|Overall validation.*PASS"; then
        return 0
    fi
    return 1
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

# Function to deploy code as API executable
deploy_code() {
    print_info "Deploying code as API executable..."
    
    # Deploy the latest version
    if clasp deploy 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Code deployed successfully"
        return 0
    else
        print_warning "Failed to create new deployment, attempting to update existing deployment..."
        
        # Try to get existing deployment and update it
        local deployment_id=$(clasp deployments 2>/dev/null | grep -o '@[0-9]\+' | head -1 | cut -c2-)
        
        if [ -n "$deployment_id" ]; then
            print_info "Found existing deployment ID: $deployment_id, updating..."
            if clasp deploy --deploymentId "$deployment_id" 2>&1 | tee -a "$LOG_FILE"; then
                print_success "Existing deployment updated successfully"
                return 0
            else
                print_error "Failed to update existing deployment"
                return 1
            fi
        else
            print_error "No existing deployment found and failed to create new one"
            return 1
        fi
    fi
}

# Function to run tests remotely
run_tests() {
    local section=${1:-"all"}
    
    case $section in
        "1"|"section1")
            print_info "Executing Section 1 tests remotely..."
            local test_output=$(clasp run testSection1 2>&1 | tee -a "$LOG_FILE")
            ;;
        "2"|"section2")
            print_info "Executing Section 2 tests remotely..."
            local test_output=$(clasp run testSection2 2>&1 | tee -a "$LOG_FILE")
            ;;
        "all"|*)
            print_info "Executing all tests remotely..."
            # Run Section 1 first
            print_info "Running Section 1 tests..."
            local test_output1=$(clasp run testSection1 2>&1 | tee -a "$LOG_FILE")
            
            # Then run Section 2
            print_info "Running Section 2 tests..."
            local test_output2=$(clasp run testSection2 2>&1 | tee -a "$LOG_FILE")
            ;;
    esac
    
    local exit_code=$?
    
    # Check if tests actually ran by looking for test results in logs
    # The clasp command may fail but tests can still execute successfully
    if check_test_success_in_logs; then
        print_success "Test execution completed successfully"
        return 0
    elif [[ $exit_code -eq 0 ]]; then
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
    local section=${1:-"all"}
    
    case $section in
        "1"|"section1")
            print_info "Running Section 1 environment validation..."
            local validation_output=$(clasp run validateSection1Setup 2>&1 | tee -a "$LOG_FILE")
            ;;
        "2"|"section2") 
            print_info "Running Section 2 environment validation..."
            local validation_output=$(clasp run validateSection2Setup 2>&1 | tee -a "$LOG_FILE")
            ;;
        "all"|*)
            print_info "Running full environment validation..."
            # Run Section 1 validation first
            print_info "Validating Section 1 setup..."
            local validation_output1=$(clasp run validateSection1Setup 2>&1 | tee -a "$LOG_FILE")
            
            # Then run Section 2 validation
            print_info "Validating Section 2 setup..."
            local validation_output2=$(clasp run validateSection2Setup 2>&1 | tee -a "$LOG_FILE")
            ;;
    esac
    
    local exit_code=$?
    
    # Check if validation actually ran by looking for validation results in logs
    if check_validation_success_in_logs; then
        print_success "Validation completed successfully"
        return 0
    elif [[ $exit_code -eq 0 ]]; then
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
    echo "Usage: $0 [options] [section]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -v, --validate      Run validation tests only"
    echo "  -t, --tests         Run full test suite only (skip validation)"
    echo "  -p, --push-only     Push and deploy code only (no test execution)"
    echo "  -l, --logs-only     Retrieve logs only (no push or execution)"
    echo "  -q, --quiet         Minimal output (errors only)"
    echo "  --no-logs           Skip log retrieval"
    echo ""
    echo "Sections:"
    echo "  1, section1         Run Section 1 tests only (Infrastructure)"
    echo "  2, section2         Run Section 2 tests only (ScriptProperties Master Index)"
    echo "  all                 Run all sections (default)"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full workflow: push, deploy, test all sections, retrieve logs"
    echo "  $0 --validate       # Quick validation check for all sections"
    echo "  $0 --validate 2     # Quick validation check for Section 2 only"
    echo "  $0 --tests 1        # Run Section 1 tests only"
    echo "  $0 --tests 2        # Run Section 2 tests only"
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
SECTION="all"

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
        1|section1|2|section2|all)
            SECTION=$1
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
        
        # Deploy the code as API executable
        if ! deploy_code; then
            print_error "Code deployment failed, aborting"
            exit 1
        fi
        
        if [ "$PUSH_ONLY" = true ]; then
            print_success "Code push and deployment completed successfully"
            exit 0
        fi
    fi
    
    # Run validation if requested or in full mode
    if [ "$VALIDATE_ONLY" = true ] || ([ "$TESTS_ONLY" != true ] && [ "$PUSH_ONLY" != true ]); then
        print_header "Running Environment Validation - Section $SECTION"
        run_validation "$SECTION"
    fi
    
    # Run tests if requested or in full mode
    if [ "$TESTS_ONLY" = true ] || ([ "$VALIDATE_ONLY" != true ] && [ "$PUSH_ONLY" != true ]); then
        print_header "Running Test Suite - Section $SECTION"
        run_tests "$SECTION"
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