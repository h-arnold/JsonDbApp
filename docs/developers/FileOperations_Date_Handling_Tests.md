# FileOperations Date Handling Test Cases

## Overview

Additional comprehensive test cases added to `FileOperationsTest.js` to verify JSON serialisation/deserialisation with Date objects, ensuring the FileOperations class properly handles Date objects through the Drive API file operations.

## New Test Suite: FileOperations Date Handling

### Purpose
Tests the critical functionality of FileOperations to:
- Serialise Date objects to ISO strings when writing to Drive files
- Deserialise ISO strings back to Date objects when reading from Drive files
- Maintain Date object integrity through write-read cycles
- Handle edge cases with invalid date-like strings

### Test Categories

#### 1. Core Date Preservation Tests
- **Date Round-trip Testing**: Verify Date objects survive write→read cycles
- **Storage Verification**: Confirm Date objects are stored as ISO strings in actual files
- **Complex Structure Handling**: Test nested objects, arrays, and deeply nested Date objects

#### 2. Data Type Handling Tests
- **Mixed Data Types**: Date objects, ISO strings, invalid date strings, other primitives
- **Array Processing**: Multiple Date objects in arrays, mixed arrays
- **Deep Nesting**: Date objects at various nesting levels

#### 3. Edge Case Testing
- **Invalid Date Strings**: Almost-valid ISO strings, wrong formats, malformed dates
- **Precision Testing**: Millisecond precision, timezone handling, historic/future dates
- **Boundary Conditions**: Empty objects, null values, undefined properties

#### 4. Error Handling Enhancement
- **Corrupted JSON with Dates**: Files with partial JSON containing date strings
- **Double-parsing Detection**: Files with already-stringified JSON
- **Empty File Handling**: Graceful handling of empty files

## Key Integration Points

### ObjectUtils.convertDateStringsToObjects()
- Used in `FileOperations.readFile()` after JSON parsing
- Recursively converts ISO date strings to Date objects
- Preserves other data types unchanged

### JSON.stringify() in writeFile()
- Converts Date objects to ISO strings during serialisation
- Standard JSON serialisation with 2-space indentation
- Maintains data structure integrity

### ErrorHandler.detectDoubleParsing()
- Detects attempts to parse already-parsed content
- Prevents double-conversion issues
- Provides clear error messages

## Test Data Patterns

### Basic Date Object Test
```javascript
const testData = {
  created: new Date('2023-06-15T10:30:00.000Z'),
  updated: new Date('2024-01-01T00:00:00.000Z'),
  metadata: {
    lastAccess: new Date('2024-06-11T15:45:30.123Z')
  }
};
```

### Complex Nested Structure
```javascript
const testData = {
  user: {
    profile: {
      personal: {
        birthDate: new Date('1990-05-15T00:00:00.000Z'),
        preferences: {
          lastUpdated: new Date('2024-06-11T10:00:00.000Z')
        }
      }
    }
  }
};
```

### Mixed Data Types
```javascript
const testData = {
  actualDate: new Date('2023-06-15T10:30:00.000Z'),
  isoString: '2023-06-15T10:30:00.000Z',
  notADate: '2023-not-a-date',
  regularString: 'just a string',
  number: 12345,
  boolean: true,
  nullValue: null
};
```

## Test Execution

### Running FileOperations Tests
```javascript
// In Google Apps Script console
runFileOperationsTests()
```

### Expected Test Flow
1. **Setup**: Create test folder and initial file
2. **Functionality**: Basic CRUD operations
3. **Date Handling**: New comprehensive date tests ✨
4. **Error Handling**: Enhanced with date-related error scenarios
5. **Edge Cases**: Existing edge case tests
6. **Cleanup**: Remove all test files and folders

## Validation Criteria

### Date Preservation
- ✅ Date objects maintain exact millisecond precision
- ✅ Timezone information preserved (UTC)
- ✅ Date arithmetic operations work on deserialised objects
- ✅ Date comparisons function correctly

### Storage Format
- ✅ Drive files contain ISO string format: `"2023-06-15T10:30:00.000Z"`
- ✅ No double-stringification in stored content
- ✅ Valid JSON structure maintained

### Error Resilience
- ✅ Invalid date strings remain as strings
- ✅ Corrupted JSON with dates throws appropriate errors
- ✅ Double-parsing attempts detected and handled

## Architecture Impact

### File Boundary Principle
Date serialisation/deserialisation occurs exclusively at the file boundary:
- **Write**: Date objects → ISO strings (via JSON.stringify)
- **Read**: ISO strings → Date objects (via ObjectUtils.convertDateStringsToObjects)
- **Internal**: Date objects preserved throughout application

### Downstream Benefits
These tests ensure that higher-level components (Collection, Database) can:
- Store documents with Date fields confidently
- Perform date-based queries reliably
- Maintain temporal data integrity
- Support complex date operations

## Future Considerations

### Performance Testing
- Large files with many Date objects
- Deeply nested structures with dates
- Concurrent file operations with date data

### Advanced Date Scenarios
- Custom date formats (if needed)
- Date object subclasses
- Timezone-aware Date handling (if required)

## Related Components

- **ObjectUtils**: Provides `convertDateStringsToObjects()` utility
- **ErrorHandler**: Provides double-parsing detection
- **Collection**: Benefits from reliable date handling
- **DocumentOperations**: Uses proper date-preserving cloning
