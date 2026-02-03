# Clasp Watch Manager Documentation

- [Clasp Watch Manager Documentation](#clasp-watch-manager-documentation)
  - [Overview](#overview)
  - [Purpose](#purpose)
  - [Prerequisites](#prerequisites)
    - [Required Software](#required-software)
    - [Project Configuration](#project-configuration)
    - [Authentication Setup](#authentication-setup)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Basic Commands](#basic-commands)
      - [Start Clasp Watch](#start-clasp-watch)
      - [Check Status](#check-status)
      - [Stop Watch Process](#stop-watch-process)
      - [Restart Watch Process](#restart-watch-process)
      - [Show Help](#show-help)
    - [Command Options](#command-options)
  - [Process Management](#process-management)
    - [PID File Management](#pid-file-management)
    - [Log File](#log-file)
    - [Background Process Handling](#background-process-handling)
  - [Authentication Flow](#authentication-flow)
    - [Automatic Detection](#automatic-detection)
    - [Login Process](#login-process)
    - [Authentication Persistence](#authentication-persistence)
  - [File Watching Behaviour](#file-watching-behaviour)
    - [What Gets Watched](#what-gets-watched)
    - [Push Triggers](#push-triggers)
    - [Push Output](#push-output)
  - [Workflow Examples](#workflow-examples)
    - [Daily Development Workflow](#daily-development-workflow)
    - [Troubleshooting Workflow](#troubleshooting-workflow)
    - [CI/CD Integration](#cicd-integration)
  - [Error Handling](#error-handling)
    - [Common Issues and Solutions](#common-issues-and-solutions)
      - [Authentication Errors](#authentication-errors)
      - [Process Management Issues](#process-management-issues)
      - [File Permission Errors](#file-permission-errors)
      - [Missing Prerequisites](#missing-prerequisites)
  - [Advanced Usage](#advanced-usage)
    - [Custom Log Location](#custom-log-location)
    - [Multiple Project Management](#multiple-project-management)
    - [Integration with Development Tools](#integration-with-development-tools)
      - [VS Code Integration](#vs-code-integration)
      - [Git Hooks Integration](#git-hooks-integration)
  - [Security Considerations](#security-considerations)
    - [Authentication Token Storage](#authentication-token-storage)
    - [File Access](#file-access)
    - [Network Security](#network-security)
  - [Maintenance](#maintenance)
    - [Regular Tasks](#regular-tasks)
    - [Script Updates](#script-updates)
  - [Integration with JsonDbApp Project](#integration-with-jsondbapp-project)
    - [Project Structure Compatibility](#project-structure-compatibility)
    - [Testing Integration](#testing-integration)
    - [Development Workflow](#development-workflow)
  - [Troubleshooting Guide](#troubleshooting-guide)
    - [Debug Mode](#debug-mode)
    - [Common Log Messages](#common-log-messages)
      - [Success Messages](#success-messages)
      - [Warning Messages](#warning-messages)
      - [Error Messages](#error-messages)
    - [Recovery Procedures](#recovery-procedures)
      - [Complete Reset](#complete-reset)
      - [Authentication Reset](#authentication-reset)
  - [Support and Contributing](#support-and-contributing)
    - [Getting Help](#getting-help)
    - [Contributing Improvements](#contributing-improvements)


## Overview

The `clasp-watch.sh` script is a comprehensive tool for managing Google Apps Script development workflows. It automatically handles clasp authentication, starts file watching for continuous deployment, and provides process management capabilities for background operations.

## Purpose

This script simplifies the development workflow by:

- Checking clasp authentication status automatically
- Logging in to clasp when required (using `--no-localhost` for compatibility)
- Starting `clasp push --watch` in the background for continuous deployment
- Managing the watch process lifecycle (start, stop, restart, status)
- Providing detailed logging and status reporting

## Prerequisites

### Required Software

- **Node.js**: Required for clasp installation
- **clasp**: Google Apps Script command-line tool

  ```bash
  npm install -g @google/clasp
  ```

### Project Configuration

- **`.clasp.json`**: Project must be configured with clasp
  - Create new project: `clasp create --title "Your Project Name"`
  - Clone existing project: `clasp clone <scriptId>`

### Authentication Setup

- Google account with Apps Script API enabled
- Valid OAuth credentials for clasp login

## Installation

1. Ensure the script is executable:

   ```bash
   chmod +x clasp-watch.sh
   ```

2. Verify prerequisites:

   ```bash
   ./clasp-watch.sh --help
   ```

## Usage

### Basic Commands

#### Start Clasp Watch

```bash
./clasp-watch.sh
```

- Checks authentication status
- Logs in if not authenticated (using `clasp login --no-localhost`)
- Starts `clasp push --watch` in the background
- Creates PID file for process management

#### Check Status

```bash
./clasp-watch.sh --status
```

- Shows whether clasp watch is currently running
- Displays process ID and log file location

#### Stop Watch Process

```bash
./clasp-watch.sh --stop
```

- Gracefully terminates the background watch process
- Cleans up PID files

#### Restart Watch Process

```bash
./clasp-watch.sh --restart
```

- Stops existing watch process (if running)
- Starts a new watch process
- Useful for applying configuration changes

#### Show Help

```bash
./clasp-watch.sh --help
```

- Displays usage information and command options

### Command Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help message and usage examples |
| `--stop` | `-s` | Stop running clasp watch process |
| `--restart` | `-r` | Restart clasp watch process |
| `--status` | | Show current watch process status |

## Process Management

### PID File Management

The script uses `.clasp-watch.pid` to track the background process:

- Created when watch process starts
- Contains the process ID (PID)
- Automatically cleaned up when process stops
- Used for status checking and process termination

### Log File

Watch process output is redirected to `clasp-watch.log`:

- Contains clasp push output and status messages
- Shows file changes and push confirmations
- Useful for debugging and monitoring

### Background Process Handling

- Uses `nohup` to run process independent of terminal session
- Process continues running even if terminal is closed
- Proper signal handling for graceful shutdown

## Authentication Flow

### Automatic Detection

The script checks authentication by attempting `clasp list`:

```bash
# Check if already authenticated
if clasp list 2>/dev/null | grep -q "scriptId"
```

### Login Process

If not authenticated, the script runs:

```bash
clasp login --no-localhost
```

**Why `--no-localhost`?**

- Compatible with remote development environments
- Works in containers and codespaces
- Avoids localhost callback issues
- Requires manual browser authentication

### Authentication Persistence

- Clasp stores authentication tokens locally
- Tokens persist across script runs
- Re-authentication only needed if tokens expire

## File Watching Behaviour

### What Gets Watched

The script starts `clasp push --watch` which monitors:

- All files in the project directory
- Subdirectories included by default
- Files matching `.claspignore` patterns are excluded

### Push Triggers

Files are automatically pushed when:

- New files are created
- Existing files are modified
- Files are deleted (removes from Apps Script)

### Push Output

The log shows detailed information:

```
Pushed 11 files.
└─ src/core/MasterIndex.js
└─ src/utils/Logger.js
└─ src/utils/ErrorHandler.js
...
Waiting for changes...
```

## Workflow Examples

### Daily Development Workflow

1. **Start your session:**

   ```bash
   ./clasp-watch.sh
   ```

2. **Edit your code files** - changes are automatically pushed

3. **Check status when needed:**

   ```bash
   ./clasp-watch.sh --status
   ```

4. **End your session:**

   ```bash
   ./clasp-watch.sh --stop
   ```

### Troubleshooting Workflow

1. **Check if process is running:**

   ```bash
   ./clasp-watch.sh --status
   ```

2. **View recent activity:**

   ```bash
   tail -f clasp-watch.log
   ```

3. **Restart if needed:**

   ```bash
   ./clasp-watch.sh --restart
   ```

### CI/CD Integration

```bash
# In automated scripts
if ! ./clasp-watch.sh --status; then
    ./clasp-watch.sh
    echo "Clasp watch started for CI/CD"
fi
```

## Error Handling

### Common Issues and Solutions

#### Authentication Errors

**Problem:** Login fails or times out

```
✗ Failed to log in to clasp
```

**Solution:**

1. Ensure Google Apps Script API is enabled
2. Check internet connectivity
3. Complete browser authentication process
4. Try manual login: `clasp login --no-localhost`

#### Process Management Issues

**Problem:** PID file exists but process not running

```
⚠ PID file exists but process is not running
```

**Solution:**

```bash
./clasp-watch.sh --restart
```

#### File Permission Errors

**Problem:** Script not executable

```
bash: ./clasp-watch.sh: Permission denied
```

**Solution:**

```bash
chmod +x clasp-watch.sh
```

#### Missing Prerequisites

**Problem:** clasp not installed

```
✗ clasp is not installed
```

**Solution:**

```bash
npm install -g @google/clasp
```

**Problem:** Project not configured

```
✗ .clasp.json not found
```

**Solution:**

```bash
clasp create --title "Your Project Name"
# or
clasp clone <your-script-id>
```

## Advanced Usage

### Custom Log Location

To redirect logs to a different file:

```bash
# Modify the script's log file variable
WATCH_PID_FILE=".clasp-watch.pid"
LOG_FILE="custom-clasp.log"  # Add this line
```

### Multiple Project Management

For managing multiple Apps Script projects:

```bash
# Project 1
cd /path/to/project1
./clasp-watch.sh

# Project 2
cd /path/to/project2
./clasp-watch.sh
```

Each project maintains its own PID file and log.

### Integration with Development Tools

#### VS Code Integration

Add to VS Code tasks.json:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start Clasp Watch",
            "type": "shell",
            "command": "./clasp-watch.sh",
            "group": "build",
            "isBackground": true,
            "presentation": {
                "echo": true,
                "reveal": "silent",
                "focus": false,
                "panel": "shared"
            }
        }
    ]
}
```

#### Git Hooks Integration

Add to `.git/hooks/post-commit`:

```bash
#!/bin/bash
# Auto-start clasp watch after commits
if [ -f "clasp-watch.sh" ]; then
    ./clasp-watch.sh --status || ./clasp-watch.sh
fi
```

## Security Considerations

### Authentication Token Storage

- Clasp stores OAuth tokens in `~/.clasprc.json`
- Tokens have limited scope (Apps Script API only)
- Tokens can be revoked from Google Account settings

### File Access

- Script only accesses current project directory
- No sensitive data is logged
- PID files contain only process numbers

### Network Security

- All communication uses HTTPS
- Authentication uses OAuth 2.0
- No credentials stored in script

## Maintenance

### Regular Tasks

1. **Monitor log file size:**

   ```bash
   ls -lh clasp-watch.log
   ```

2. **Clean old logs periodically:**

   ```bash
   # Rotate logs when they get large
   mv clasp-watch.log clasp-watch.log.old
   ```

3. **Check for clasp updates:**

   ```bash
   npm update -g @google/clasp
   ```

### Script Updates

When updating the script:

1. Stop current watch process
2. Update script file
3. Make executable if needed
4. Restart watch process

## Integration with JsonDbApp Project

### Project Structure Compatibility

The script is designed to work with the JsonDbApp project structure:

- Monitors `src/` directory for core components
- Watches `old_tests/` directory for test files
- Includes `docs/` directory if needed

### Testing Integration

Works alongside `test-runner.sh`:

```bash
# Start continuous deployment
./clasp-watch.sh

# Run tests in another terminal
./test-runner.sh --tests
```

### Development Workflow

1. Start clasp watch for continuous deployment
2. Edit code files - automatically pushed
3. Run tests to verify changes
4. Monitor logs for push confirmations

## Troubleshooting Guide

### Debug Mode

For debugging issues, run with bash debug:

```bash
bash -x ./clasp-watch.sh --status
```

### Common Log Messages

#### Success Messages

- `✓ clasp is installed` - Prerequisites OK
- `✓ Already authenticated with clasp` - No login needed
- `✓ clasp watch started successfully` - Process running
- `Pushed X files` - Files successfully uploaded

#### Warning Messages

- `⚠ clasp watch is already running` - Process already active
- `⚠ Not authenticated with clasp` - Login required
- `⚠ No clasp watch PID file found` - No active process

#### Error Messages

- `✗ clasp is not installed` - Install clasp first
- `✗ .clasp.json not found` - Configure project
- `✗ Failed to log in to clasp` - Authentication issue
- `✗ clasp watch failed to start` - Process start failure

### Recovery Procedures

#### Complete Reset

```bash
# Stop any running processes
./clasp-watch.sh --stop

# Clean up files
rm -f .clasp-watch.pid clasp-watch.log

# Restart fresh
./clasp-watch.sh
```

#### Authentication Reset

```bash
# Logout and login again
clasp logout
./clasp-watch.sh  # Will prompt for login
```

## Support and Contributing

### Getting Help

1. Check this documentation first
2. Review log files for error details
3. Try common troubleshooting steps
4. Check clasp documentation: <https://github.com/google/clasp>

### Contributing Improvements

When modifying the script:

1. Follow existing code style
2. Add appropriate error handling
3. Update this documentation
4. Test all command options
5. Verify authentication flows

---

*This documentation is part of the JsonDbApp project developer resources. For project-specific information, see the main project documentation in `/docs/`.*
