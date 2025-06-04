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

# Function to check clasp installation and basic project setup
check_clasp_prerequisites() {
    print_info "Checking clasp prerequisites..."
    
    if ! command -v clasp &> /dev/null; then
        print_error "clasp is not installed. Please install with: npm install -g @google/clasp"
        exit 1
    fi
    
    if [ ! -f ".clasp.json" ]; then
        print_error ".clasp.json not found. Your project is not configured with clasp."
        print_info "Please run 'clasp create --title <YourProjectTitle>' or 'clasp clone <scriptId>' to set up your project."
        exit 1
    fi
    
    print_success "Clasp prerequisites verified (clasp installed, .clasp.json found)."
}

# Function to check clasp-watch status
check_clasp_watch_status() {
    print_info "Checking clasp-watch status..."
    
    if [ ! -f "./clasp-watch.sh" ]; then
        print_warning "clasp-watch.sh not found in current directory"
        print_info "Deployment will proceed but clasp-watch is recommended for continuous deployment"
        return 0
    fi
    
    if ./clasp-watch.sh --status 2>/dev/null; then
        print_success "clasp-watch is running - project should be up to date"
        return 0
    else
        print_warning "clasp-watch is not running"
        print_info "You may want to start it with: ./clasp-watch.sh"
        print_info "Continuing with deployment..."
        return 0
    fi
}

# Function to deploy as executable API
deploy_executable_api() {
    print_info "Deploying Apps Script project as executable API..."
    
    # Check if we already have deployments
    local existing_deployments=$(clasp deployments 2>/dev/null || echo "")
    
    if echo "$existing_deployments" | grep -q "API Executable"; then
        print_info "API Executable deployment already exists"
        
        # Get the deployment ID for the API Executable
        local deployment_id=$(echo "$existing_deployments" | grep "API Executable" | awk '{print $2}' | head -1)
        
        if [ -n "$deployment_id" ]; then
            print_info "Updating existing API Executable deployment (ID: $deployment_id)..."
            if clasp deploy --deploymentId "$deployment_id" --description "Updated API Executable for testing" 2>&1 | tee -a "$LOG_FILE"; then
                print_success "API Executable deployment updated successfully"
                return 0
            else
                print_warning "Failed to update existing deployment, will create new one"
            fi
        fi
    fi
    
    # Create new API Executable deployment
    print_info "Creating new API Executable deployment..."
    if clasp deploy --description "API Executable for testing" 2>&1 | tee -a "$LOG_FILE"; then
        print_success "New API Executable deployment created successfully"
        return 0
    else
        print_error "Failed to create API Executable deployment"
        print_info "This may cause issues with 'clasp run' operations"
        print_info "You can manually deploy via Apps Script editor or check clasp authentication"
        return 1
    fi
}

# Function to login for run operations (tests/validation)
login_for_run() {
    if [ "$LOGIN_FOR_RUN_SUCCESSFUL" = true ]; then
        print_info "Already logged in for 'clasp run' operations in this session."
        return 0
    fi

    print_info "Preparing for 'clasp run' operations..."

    if [ ! -f ".gas-testing.json" ]; then
        print_error "'.gas-testing.json' not found."
        print_info "This file is required for 'clasp run' operations (tests, validation)."
        print_info "It should contain your OAuth Client ID credentials for a 'Desktop Application'."
        print_info "Typically, you download this as 'client_secret.json' and rename it or point to it."
        print_info "Refer to 'clasp run' documentation for details on creating this file."
        exit 1
    fi

    local user_email_to_use
    if [ -n "$GAS_USER_EMAIL" ]; then
        user_email_to_use="$GAS_USER_EMAIL"
        print_info "Using GAS_USER_EMAIL environment variable: $user_email_to_use"
    else
        print_warning "GAS_USER_EMAIL environment variable is not set."
        read -r -p "Enter your Google account email for 'clasp run' (e.g., user@example.com): " entered_email
        if [ -z "$entered_email" ]; then
            print_error "User email is required for 'clasp run' operations."
            exit 1
        fi
        user_email_to_use="$entered_email"
    fi
    
    print_info "Attempting login for 'clasp run' operations (user: $user_email_to_use)..."
    if clasp login --user "$user_email_to_use" --use-project-scopes --creds .gas-testing.json --no-localhost; then
        print_success "Login for 'clasp run' operations successful."
        LOGIN_FOR_RUN_SUCCESSFUL=true
        return 0
    else
        print_error "Login for 'clasp run' operations failed."
        print_info "Please ensure you can login with: clasp login --user $user_email_to_use --use-project-scopes --creds .gas-testing.json --no-localhost"
        print_info "This login is required to execute functions remotely via 'clasp run'."
        exit 1
    fi
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
        "3"|"section3")
            print_info "Executing Section 3 tests remotely..."
            local test_output=$(clasp run testSection3 2>&1 | tee -a "$LOG_FILE")
            ;;
        "all"|*)
            print_info "Executing all tests remotely..."
            # Run Section 1 first
            print_info "Running Section 1 tests..."
            local test_output1=$(clasp run testSection1 2>&1 | tee -a "$LOG_FILE")
            
            # Then run Section 2
            print_info "Running Section 2 tests..."
            local test_output2=$(clasp run testSection2 2>&1 | tee -a "$LOG_FILE")
            
            # Then run Section 3
            print_info "Running Section 3 tests..."
            local test_output3=$(clasp run testSection3 2>&1 | tee -a "$LOG_FILE")
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
        "3"|"section3")
            print_info "Running Section 3 environment validation..."
            local validation_output=$(clasp run validateSection3Setup 2>&1 | tee -a "$LOG_FILE")
            ;;
        "all"|*)
            print_info "Running full environment validation..."
            # Run Section 1 validation first
            print_info "Validating Section 1 setup..."
            local validation_output1=$(clasp run validateSection1Setup 2>&1 | tee -a "$LOG_FILE")
            
            # Then run Section 2 validation
            print_info "Validating Section 2 setup..."
            local validation_output2=$(clasp run validateSection2Setup 2>&1 | tee -a "$LOG_FILE")
            
            # Then run Section 3 validation
            print_info "Validating Section 3 setup..."
            local validation_output3=$(clasp run validateSection3Setup 2>&1 | tee -a "$LOG_FILE")
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
            cat logs.json | jq -r '.[] | "\(.timestamp) [\(.level)] \(.message)"' 2>/dev/null | tee -a "$LOG_FILE" || {
                print_warning "Could not parse JSON logs, showing raw output"
                cat logs.json | tee -a "$LOG_FILE"
            }
        else
            print_warning "jq not available, showing raw JSON logs"
            cat logs.json | tee -a "$LOG_FILE"
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
    echo "Workflow:"
    echo "  1. Check clasp prerequisites and clasp-watch status"
    echo "  2. Deploy project as executable API (required for 'clasp run')"
    echo "  3. Authenticate for 'clasp run' operations"
    echo "  4. Execute validation/tests remotely"
    echo "  5. Retrieve and display execution logs"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -v, --validate      Run validation tests only"
    echo "  -t, --tests         Run full test suite only (skip validation)"
    echo "  -l, --logs-only     Retrieve logs only (no deployment or execution)"
    echo "  -q, --quiet         Minimal output (errors only)"
    echo "  --no-logs           Skip log retrieval"
    echo ""
    echo "Sections:"
    echo "  1, section1         Run Section 1 tests only (Infrastructure)"
    echo "  2, section2         Run Section 2 tests only (ScriptProperties Master Index)"
    echo "  3, section3         Run Section 3 tests only (File Service and Drive Integration)"
    echo "  all                 Run all sections (default)"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full workflow: deploy, test all sections, retrieve logs"
    echo "  $0 --validate       # Deploy and run validation check for all sections"
    echo "  $0 --validate 2     # Deploy and run validation check for Section 2 only"
    echo "  $0 --validate 3     # Deploy and run validation check for Section 3 only"
    echo "  $0 --tests 1        # Deploy and run Section 1 tests only"
    echo "  $0 --tests 2        # Deploy and run Section 2 tests only"
    echo "  $0 --tests 3        # Deploy and run Section 3 tests only"
    echo "  $0 --logs-only      # Get latest execution logs (no deployment)"
    echo ""
    echo "Prerequisites:"
    echo "  - clasp must be installed and project configured"
    echo "  - clasp-watch.sh recommended for continuous deployment"
    echo "  - .gas-testing.json required for 'clasp run' authentication"
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
LOGS_ONLY=false
QUIET=false
NO_LOGS=false
LOGIN_FOR_RUN_SUCCESSFUL=false
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
        1|section1|2|section2|3|section3|all)
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
    
    # Check clasp prerequisites unless we're only retrieving logs
    if [ "$LOGS_ONLY" != true ]; then
        check_clasp_prerequisites
        
        # Check clasp-watch status and deploy as executable API
        check_clasp_watch_status
        deploy_executable_api
    fi
    
    # Handle logs-only mode
    if [ "$LOGS_ONLY" = true ]; then
        retrieve_logs
        exit $?
    fi
    
    # Run validation if requested or in full mode
    if [ "$VALIDATE_ONLY" = true ] || [ "$TESTS_ONLY" != true ]; then
        login_for_run # Authenticate for running functions
        print_header "Running Environment Validation - Section $SECTION"
        run_validation "$SECTION"
    fi
    
    # Run tests if requested or in full mode
    if [ "$TESTS_ONLY" = true ] || [ "$VALIDATE_ONLY" != true ]; then
        login_for_run # Authenticate for running functions (again, safe if already done)
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