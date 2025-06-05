# GAS-DB

A document database implemented in Google Apps Script using the Google Drive API. Supports MongoDB-like syntax for CRUD operations on named collections, with data consistency managed through a ScriptProperties-based master index.

## 🚀 Current Status: Section 1 Complete

**✅ Project Setup and Basic Infrastructure (COMPLETED)**

The foundational infrastructure is complete and ready for database implementation:

### Core Components Implemented
- **GASDBLogger**: Multi-level logging system (ERROR/WARN/INFO/DEBUG) with component-specific loggers
- **ErrorHandler**: Standardized error types and validation utilities  
- **IdGenerator**: Multiple ID generation strategies (UUID, timestamp, ObjectId, etc.)
- **Test Framework**: Complete TDD infrastructure with AssertionUtilities and TestRunner

### Recent Updates
- **Logger Rename**: Renamed custom `Logger` class to `GASDBLogger` to avoid conflicts with Google Apps Script's built-in Logger class
- **Documentation**: Updated all documentation to reflect the naming changes
- **Verification**: All tests pass, no compilation errors, full backward compatibility maintained

## 🗂️ Project Structure

```
├── src/
│   ├── components/testing/     # Test framework
│   ├── core/                  # Future: Database, Collection, MasterIndex
│   └── utils/                 # Utilities (GASDBLogger, ErrorHandler, IdGenerator)
├── tests/
│   ├── unit/                  # Unit tests
│   └── TestExecution.js       # Test runner entry point
├── docs/                      # Comprehensive documentation
└── Configuration files (clasp.json, appsscript.json, package.json)
```

## 🧪 Testing

### Automated Testing
Use the included test automation script for streamlined development:

```bash
# Run all tests (recommended)
./test-runner.sh

# Run specific section tests
./test-runner.sh 1

# Run validation only
./test-runner.sh --validate
```

### Manual Testing
Run tests directly in Google Apps Script editor:

```javascript
// initialise environment
initialiseTestEnvironment();

// Quick validation
validateSection1Setup();

// Run all tests
testSection1();

// Get help
showTestHelp();
```

## 📚 Documentation

### For Developers
- [**Developer Documentation**](./docs/developers/README.md) - Complete development guides
- [**Testing Framework**](./docs/developers/Testing_Framework.md) - How to write and run tests
- [**Infrastructure Components**](./docs/developers/Infrastructure_Components.md) - Logging, error handling, ID generation
- [**test-runner.sh Guide**](./docs/developers/test-runner.sh.md) - Automated testing workflow

### Project Documentation
- [**Project Requirements**](./docs/01_GAS_DB_PRD_Updated.md) - Detailed project specification
- [**Class Diagrams**](./docs/04_Class_Diagrams_Updated.md) - System architecture diagrams
- [**Implementation Plan**](./docs/GAS_DB_Implementation_Plan_Updated.md) - Development roadmap

## 📋 Next Steps: Section 2

Ready to implement **ScriptProperties Master Index**:
- Virtual locking mechanism
- Conflict detection and resolution  
- Cross-instance coordination

## 🔧 Development Setup

1. Install clasp: `npm install -g @google/clasp`
2. Login to Google: `clasp login`
3. Push to Google Apps Script: `clasp push`
4. Run tests in GAS editor using the functions above

---

*Recommended for masochists and those who enjoy the challenge of building databases on unconventional platforms.*
