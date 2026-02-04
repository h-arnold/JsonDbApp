/**
 * 03_UpdateEngineFieldPathAccess.js - Delegates dot-path operations to FieldPathUtils
 */
/* exported UpdateEngineFieldPathAccess */
/**
 * Provides UpdateEngine-specific accessors backed by FieldPathUtils.
 */
class UpdateEngineFieldPathAccess {
  /**
   * Construct a field-path adapter bound to the UpdateEngine instance.
   * @param {UpdateEngine} engine - Parent update engine facade
   * @param {FieldPathUtils} fieldPathUtils - Shared field-path utility instance
   */
  constructor(engine, fieldPathUtils) {
    this._engine = engine;
    this._fieldPathUtils = fieldPathUtils;
  }

  /**
   * Get field value using dot notation path
   * @param {Object} document - Document to read from
   * @param {string} fieldPath - Dot notation field path
   * @returns {*} Field value or undefined
   */
  getValue(document, fieldPath) {
    return this._fieldPathUtils.getValue(document, fieldPath);
  }

  /**
   * Set field value using dot notation path, creating nested objects as needed
   * @param {Object} document - Document to modify
   * @param {string} fieldPath - Dot notation field path
   * @param {*} value - Value to set
   */
  setValue(document, fieldPath, value) {
    this._fieldPathUtils.setValue(document, fieldPath, value);
  }

  /**
   * Delete a field or array element at a given dot-notation path.
   * @param {Object} document - The document to update.
   * @param {string} fieldPath - Dot-notation path of the field or element to remove.
   */
  unsetValue(document, fieldPath) {
    this._fieldPathUtils.unsetValue(document, fieldPath);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UpdateEngineFieldPathAccess };
}
