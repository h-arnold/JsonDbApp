# `test-runner.sh` Documentation

This script automates the process of testing Google Apps Script projects using `clasp`. It handles pushing code, deploying, running tests in sections or all at once, validating environments, and retrieving logs.

## Features

- **Coloured Output**: Provides clear, colour-coded status messages (success, error, warning, info).
- **Prerequisite Checks**: Verifies `clasp` installation and project setup ([`.clasp.json`](.clasp.json )).
- **Dual Authentication Flow**:
  - Manages separate logins for `clasp push/deploy` operations (via `clasp login --no-localhost`).
  - Manages separate logins for `clasp run` operations (via `clasp login --user <email> --use-project-scopes --creds .gas-testing.json --no-localhost`).
- **Code Management**: Pushes code to Google Apps Script and deploys it as an API executable.
- **Selective Testing**:
  - Run all tests.
  - Run tests for specific sections (e.g., "Section 1", "Section 2").
- **Environment Validation**:
  - Run validation checks for all sections or specific sections.
- **Log Retrieval**: Fetches execution logs from Google Apps Script and attempts to parse them if `jq` is available.
- **Flexible Workflow Control**: Command-line options to:
  - Run validation only (`-v`, `--validate`).
  - Run tests only (`-t`, `--tests`).
  - Push and deploy code only (`-p`, `--push-only`).
  - Retrieve logs only (`-l`, `--logs-only`).
  - Suppress most output (`-q`, `--quiet`).
  - Skip log retrieval (`--no-logs`).
- **Session-based Login**: Remembers successful logins within the same script execution to avoid redundant authentication prompts.
- **Configuration**:
  - `LOG_FILE`: Specifies the file to store test execution logs (default: `test-execution.log`).
  - `GAS_USER_EMAIL` (environment variable): Can be set to specify the Google account email for `clasp run` operations, otherwise prompts the user.

## Usage

```bash
./test-runner.sh [options] [section]
```

### Options

- `-h, --help`: Show the help message.
- `-v, --validate`: Run validation tests only.
- `-t, --tests`: Run the full test suite only (skip validation).
- `-p, --push-only`: Push and deploy code only (no test execution).
- `-l, --logs-only`: Retrieve logs only (no push or execution).
- `-q, --quiet`: Minimal output (errors only).
- `--no-logs`: Skip log retrieval.

### Sections

- `1`, `section1`: Run Section 1 tests/validation only.
- `2`, `section2`: Run Section 2 tests/validation only.
- `all`: Run all sections (default if no section is specified).

### Examples

- Run the full workflow (push, deploy, test all, retrieve logs):

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

- Deploy code without running tests:

    ```bash
    ./test-runner.sh --push-only
    ```

- Get the latest execution logs:

    ```bash
    ./test-runner.sh --logs-only
    ```

## Script Structure Overview

### Key Functions

- `print_status`, `print_header`, `print_success`, `print_error`, `print_warning`, `print_info`: Utility functions for coloured console output.
- `check_clasp_prerequisites()`: Checks for `clasp` and [`.clasp.json`](.clasp.json ).
- `login_for_push_deploy()`: Handles authentication for `clasp push` and `clasp deploy`. Sets `LOGIN_FOR_PUSH_DEPLOY_SUCCESSFUL` flag.
- `login_for_run()`: Handles authentication for `clasp run`. Checks for [`.gas-testing.json`](.gas-testing.json ), prompts for email if `GAS_USER_EMAIL` is not set. Sets `LOGIN_FOR_RUN_SUCCESSFUL` flag.
- `check_test_success_in_logs()`: Checks `clasp logs` for indicators of test success.
- `check_validation_success_in_logs()`: Checks `clasp logs` for indicators of validation success.
- `push_code()`: Pushes code using `clasp push --force`.
- `deploy_code()`: Deploys the latest version using `clasp deploy`. Attempts to update an existing deployment if creating a new one fails.
- `run_tests()`: Executes remote test functions (`testSection1`, `testSection2`) using `clasp run`.
- `run_validation()`: Executes remote validation functions (`validateSection1Setup`, `validateSection2Setup`) using `clasp run`.
- `retrieve_logs()`: Fetches logs using `clasp logs --json` and attempts to parse with `jq`.
- `show_help()`: Displays usage instructions.
- `cleanup()`: Removes temporary files (currently `logs.json`).
- `main()`: Main execution function that parses arguments and orchestrates the workflow.

### Global Variables & Flags

- `SCRIPT_NAME`: Name of the script.
- `LOG_FILE`: Path to the log file.
- `TIMESTAMP`: Current timestamp.
- `LOGIN_FOR_PUSH_DEPLOY_SUCCESSFUL`: Boolean flag, true if login for push/deploy was successful in the current session.
- `LOGIN_FOR_RUN_SUCCESSFUL`: Boolean flag, true if login for `clasp run` was successful in the current session.
- Command-line option flags: `VALIDATE_ONLY`, `TESTS_ONLY`, `PUSH_ONLY`, `LOGS_ONLY`, `QUIET`, `NO_LOGS`.
- `SECTION`: Stores the section to be tested/validated.

## Prerequisites for `clasp run`

As detailed in the `clasp run` documentation, to execute functions remotely, the following are necessary:

1. **Project ID in [`.clasp.json`](.clasp.json )**: Ensure your [`.clasp.json`](.clasp.json ) file contains the correct `projectId`.
2. **OAuth Client ID**:
    - Create an OAuth Client ID of type "Desktop Application" in your Google Cloud Platform project.
    - Download the credentials as `client_secret.json`.
    - Rename or place this file as [`.gas-testing.json`](.gas-testing.json ) in your project root. **This file should be kept secret and ideally gitignored.**
3. **Login with Credentials**: The script's `login_for_run` function handles this by calling:

    ```bash
    clasp login --user <your_email> --use-project-scopes --creds .gas-testing.json --no-localhost
    ```

    You will be prompted for `<your_email>` if the `GAS_USER_EMAIL` environment variable is not set.
4. **`appsscript.json` Configuration**:
    - Add `"executionApi": { "access": "ANYONE" }` to your [`appsscript.json`](appsscript.json ) file.
    - Ensure all necessary OAuth scopes for your functions are listed in the `oauthScopes` array in [`appsscript.json`](appsscript.json ).
5. **API Executable Deployment**: Your script must be deployed as an API Executable. The `deploy_code` function in the script handles this.
6. **Enable Apps Script API**: Ensure the "Google Apps Script API" is enabled in your GCP project.

## Authentication Flow

The script uses two distinct login flows:

1. **For Pushing and Deploying Code**:
    - The `login_for_push_deploy` function is called.
    - It executes `clasp login --no-localhost`.
    - This authentication is generally for managing the script project files and deployments.

2. **For Running Functions (Tests/Validation)**:
    - The `login_for_run` function is called.
    - It checks for the existence of [`.gas-testing.json`](.gas-testing.json ) (which should contain your OAuth Client ID for a Desktop Application).
    - It prompts for a user email if `GAS_USER_EMAIL` is not set.
    - It executes `clasp login --user <email> --use-project-scopes --creds .gas-testing.json --no-localhost`.
    - This authentication uses the specified OAuth credentials and project scopes (from [`appsscript.json`](appsscript.json )) to authorize the execution of functions.

The script maintains `LOGIN_FOR_PUSH_DEPLOY_SUCCESSFUL` and `LOGIN_FOR_RUN_SUCCESSFUL` flags to avoid re-prompting for login if already authenticated in the current script session.

## Logging

- All `clasp` command outputs are tee'd to `$LOG_FILE` (`test-execution.log` by default).
- `retrieve_logs` function fetches structured logs using `clasp logs --json` if possible, otherwise plain text logs.
- If `jq` is installed, JSON logs are parsed for better readability.

## Error Handling

- The script uses `set -e`, so it will exit immediately if any command fails.
- Specific error messages are printed for common failure points (e.g., `clasp` not installed, login failure, push/deploy failure).
- The exit code of `clasp run` is checked, but the script also inspects the logs for explicit success messages from the test/validation functions, as `clasp run` might exit successfully even if the remote function indicated a failure.

## Customisation

- **Email for `clasp run`**: Set the `GAS_USER_EMAIL` environment variable to your Google account email to avoid being prompted.

    ```bash
    export GAS_USER_EMAIL="your.email@example.com"
    ./test-runner.sh
    ```

- **Log File**: Modify the `LOG_FILE` variable at the top of the script to change the log file name/path.
- **Test/Validation Functions**: The names of the Apps Script functions to be called for tests (`testSection1`, `testSection2`) and validation (`validateSection1Setup`, `validateSection2Setup`) are hardcoded in the `run_tests` and `run_validation` functions respectively. Change these if your Apps Script function names differ.
