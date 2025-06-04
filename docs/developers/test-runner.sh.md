# `test-runner.sh` Documentation

- [`test-runner.sh` Documentation](#test-runnersh-documentation)
  - [Features](#features)
  - [Usage](#usage)
    - [Options](#options)
    - [Sections](#sections)
    - [Examples](#examples)
  - [Script Structure Overview](#script-structure-overview)
    - [Key Functions](#key-functions)
    - [Global Variables \& Flags](#global-variables--flags)
  - [Prerequisites for `clasp run`](#prerequisites-for-clasp-run)
  - [Authentication Flow](#authentication-flow)
  - [Logging](#logging)
  - [Error Handling](#error-handling)
  - [Customisation](#customisation)

This script automates the process of testing Google Apps Script projects using `clasp`. It runs tests in sections or all at once, validates environments, and retrieves logs.

## Features

- **Coloured Output**: Provides clear, colour-coded status messages (success, error, warning, info).
- **Prerequisite Checks**: Verifies `clasp` installation and project setup ([`.clasp.json`](.clasp.json)).
- **Authentication Flow**:  
  - Manages login for running Apps Script functions (via `clasp run`).
- **Selective Testing**:
  - Run all tests.
  - Run tests for specific sections (e.g., "Section 1", "Section 2").
- **Environment Validation**:
  - Run validation checks for all sections or specific sections.
- **Log Retrieval**: Fetches execution logs from Google Apps Script and, if available, parses them using `jq`.
- **Session-based Login**: Remembers successful logins within the same session to avoid redundant authentication prompts.
- **Configuration**:
  - `LOG_FILE`: Specifies the file used to store test execution logs (default: `test-execution.log`).
  - `GAS_USER_EMAIL` (environment variable): Specify your Google account email to bypass the prompt.

## Usage

```bash
./test-runner.sh [options] [section]
```

### Options

- `-h, --help`: Show the help message.
- `-v, --validate`: Run validation tests only.
- `-t, --tests`: Run the full test suite only (skip validation).
- `-l, --logs-only`: Retrieve logs only.
- `-q, --quiet`: Minimal output (errors only).
- `--no-logs`: Skip log retrieval.

### Sections

- `1`, `section1`: Run Section 1 tests/validation only.
- `2`, `section2`: Run Section 2 tests/validation only.
- `3`, `section3`: Run Section 3 tests/validation only.
- `all`: Run all sections (default if no section is specified).

### Examples

- Run the full workflow (test all and retrieve logs):

    ```bash
    ./test-runner.sh
    ```

- Run validation for all sections:

    ```bash
    ./test-runner.sh --validate
    ```

- Run validation for Section 2 only:

    ```bash
    ./test-runner.sh --validate 2
    ```

- Run Section 1 tests only:

    ```bash
    ./test-runner.sh --tests 1
    ```

- Run Section 3 validation only:

    ```bash
    ./test-runner.sh --validate 3
    ```

- Get the latest execution logs:

    ```bash
    ./test-runner.sh --logs-only
    ```

## Script Structure Overview

### Key Functions

- `print_status`, `print_header`, `print_success`, `print_error`, `print_warning`, `print_info`: Utility functions for coloured console output.
- `check_clasp_prerequisites()`: Checks that `clasp` is installed and that [`.clasp.json`](.clasp.json) exists.
- `login_for_run()`: Handles authentication for `clasp run` operations. Checks for [`.gas-testing.json`](.gas-testing.json), prompts for email if `GAS_USER_EMAIL` is not set, and sets a session flag.
- `check_test_success_in_logs()`: Checks `clasp logs` for indicators of test success.
- `check_validation_success_in_logs()`: Checks `clasp logs` for indicators of validation success.
- `run_tests()`: Executes remote test functions (`testSection1`, `testSection2`, `testSection3`) using `clasp run`.
- `run_validation()`: Executes remote validation functions (`validateSection1Setup`, `validateSection2Setup`, `validateSection3Setup`) using `clasp run`.
- `retrieve_logs()`: Fetches logs using `clasp logs --json` and attempts to parse them using `jq`.
- `show_help()`: Displays usage instructions.
- `cleanup()`: Removes temporary files (currently `logs.json`).
- `main()`: Parses command-line arguments and orchestrates the workflow.

### Global Variables & Flags

- `SCRIPT_NAME`: Name of the script.
- `LOG_FILE`: Path to the log file.
- `TIMESTAMP`: Current timestamp.
- `LOGIN_FOR_RUN_SUCCESSFUL`: Boolean flag that indicates if login for `clasp run` was successful during the current session.
- Command-line option flags: `VALIDATE_ONLY`, `TESTS_ONLY`, `LOGS_ONLY`, `QUIET`, `NO_LOGS`.
- `SECTION`: Stores the section to be tested/validated.

## Prerequisites for `clasp run`

1. **Project ID in [`.clasp.json`](.clasp.json)**: Ensure your [`.clasp.json`](.clasp.json) file contains the correct `projectId`.
2. **OAuth Client ID**:
    - Create an OAuth Client ID of type "Desktop Application" in your Google Cloud Platform project.
    - Download the credentials as `client_secret.json`.
    - Rename or place this file as [`.gas-testing.json`](.gas-testing.json) in your project root. **This file should be kept secret and ideally gitignored.**
3. **Login with Credentials**:  
    The script's `login_for_run` function calls:
    ```bash
    clasp login --user <your_email> --use-project-scopes --creds .gas-testing.json --no-localhost
    ```
    You will be prompted for `<your_email>` if `GAS_USER_EMAIL` is not set.
4. **`appsscript.json` Configuration**:
    - Add `"executionApi": { "access": "ANYONE" }` to your [`appsscript.json`](appsscript.json) file.
    - Ensure all necessary OAuth scopes are listed in the `oauthScopes` array in [`appsscript.json`](appsscript.json).
5. **Enable Apps Script API**: Ensure the "Google Apps Script API" is enabled in your GCP project.

## Authentication Flow

The script uses a single authentication flow for running functions:

- **For Running Functions (Tests/Validation)**:
    - The `login_for_run` function is called.
    - It checks for the existence of [`.gas-testing.json`](.gas-testing.json) (which contains your OAuth Client ID credentials for a Desktop Application).
    - It prompts for a user email if `GAS_USER_EMAIL` is not set.
    - It calls:
      ```bash
      clasp login --user <your_email> --use-project-scopes --creds .gas-testing.json --no-localhost
      ```
    - A session flag is set to avoid repeated logins during a single script execution.

## Logging

- All `clasp` command outputs are tee'd to `$LOG_FILE` (default: `test-execution.log`).
- The `retrieve_logs` function attempts to fetch structured logs using `clasp logs --json` and parse them using `jq` if available.
- **Log Persistence**: Both parsed and raw logs are automatically saved to the log file AND displayed to the terminal for complete execution tracking.

## Error Handling

- The script uses `set -e`, so it exits immediately if any command fails.
- It prints specific error messages for missing prerequisites or failed authentication.
- The script checks the exit code of `clasp run` and inspects logs for success/failure indicators.

## Customisation

- **Email for `clasp run`**: Set the `GAS_USER_EMAIL` environment variable to your Google account email to avoid interactive prompts.

    ```bash
    export GAS_USER_EMAIL="your.email@example.com"
    ./test-runner.sh
    ```

- **Log File**: Modify the `LOG_FILE` variable at the top of the script to change the log file name or path.
- **Test/Validation Functions**: Update the function names in `run_tests` and `run_validation` if your Apps Script functions have different names.
