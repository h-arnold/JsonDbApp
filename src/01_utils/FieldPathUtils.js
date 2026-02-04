/**
 * FieldPathUtils.js - Safe traversal and mutation utilities for dot-notation paths
 *
 * Provides reusable helpers for reading, writing, and removing nested values using
 * MongoDB-style field paths while guarding against prototype pollution and
 * handling array indices. Designed for use by UpdateEngine and QueryEngine.
 */
/* exported FieldPathUtils */
/**
 * Utility for safe field-path traversal and mutation operations.
 */
class FieldPathUtils {
  /**
   * Create a new FieldPathUtils instance.
   * @param {Object} [options] - Configuration options
   * @param {Map<string, readonly string[]>} [options.cache] - Optional shared cache for path segments
   */
  constructor(options = {}) {
    const { cache } = options;
    this._cache = cache instanceof Map ? cache : new Map();
  }

  /**
   * Retrieve a value from a target object using a dot-notation path.
   * @param {Object} target - Target document or object
   * @param {string|string[]} fieldPath - Dot-notation path or pre-split segments
   * @returns {*} The located value or undefined when not present
   */
  getValue(target, fieldPath) {
    if (!this._isTraversable(target)) {
      return undefined;
    }

    const segments = this._normalisePath(fieldPath, 'getValue');
    let current = target;

    for (const segment of segments) {
      if (!this._isTraversable(current)) {
        return undefined;
      }

      current = this._peekNext(current, segment);

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Set a value on a target object using a dot-notation path, creating containers as needed.
   * @param {Object} target - Target document or object
   * @param {string|string[]} fieldPath - Dot-notation path or pre-split segments
   * @param {*} value - Value to assign
   */
  setValue(target, fieldPath, value) {
    this._assertTraversableTarget(target);

    const segments = this._normalisePath(fieldPath, 'setValue');
    this._assertNonEmptySegments(segments, fieldPath);

    const parentContainer = this._traverseToParent(target, segments);
    this._assignFinalSegment(parentContainer, segments[segments.length - 1], value);
  }

  /**
   * Unset a value on a target object using a dot-notation path.
   * @param {Object} target - Target document or object
   * @param {string|string[]} fieldPath - Dot-notation path or pre-split segments
   */
  unsetValue(target, fieldPath) {
    if (!this._isTraversable(target)) {
      return;
    }

    const segments = this._normalisePath(fieldPath, 'unsetValue');
    if (segments.length === 0) {
      return;
    }

    const parentInfo = this._locateParent(target, segments);
    if (!parentInfo) {
      return;
    }

    this._removeFinalSegment(parentInfo.container, parentInfo.segment);
  }

  /**
   * Convert a field path into cached, validated segments.
   * @private
   * @param {string|string[]} fieldPath - Path to normalise
   * @param {string} operation - Operation name for error reporting
   * @returns {readonly string[]} Array of path segments
   */
  _normalisePath(fieldPath, operation) {
    if (Array.isArray(fieldPath)) {
      const cloned = fieldPath.map((segment) => this._coerceSegment(segment, fieldPath, operation));
      this._validateSegments(cloned, operation);
      return Object.freeze(cloned.slice());
    }

    if (typeof fieldPath !== 'string' || fieldPath.trim() === '') {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'fieldPath',
        fieldPath,
        `${operation} requires a non-empty string path`
      );
    }

    if (!this._cache.has(fieldPath)) {
      const rawSegments = fieldPath
        .split('.')
        .map((segment) => this._coerceSegment(segment, fieldPath, operation));
      this._validateSegments(rawSegments, operation);
      this._cache.set(fieldPath, Object.freeze(rawSegments.slice()));
    }

    return this._cache.get(fieldPath);
  }

  /**
   * Ensure path segments do not contain dangerous keys.
   * @private
   * @param {string[]} segments - Path segments to validate
   * @param {string} operation - Operation name for error reporting
   */
  _validateSegments(segments, operation) {
    segments.forEach((segment) => this._validateSegment(segment, segments, operation));
  }

  /**
   * Validate a single path segment.
   * @private
   * @param {string} segment - Segment to validate
   * @param {string[]} segments - Full segment list for context
   * @param {string} operation - Operation name for error reporting
   */
  _validateSegment(segment, segments, operation) {
    if (this._isSegmentMissing(segment)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'fieldPath',
        segments.join('.'),
        `${operation} cannot operate on empty path segments`
      );
    }

    if (this._isPrototypeSegment(segment)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'fieldPath',
        segments.join('.'),
        `${operation} cannot target prototype mutation segment "${segment}"`
      );
    }
  }

  /**
   * Convert a segment to string while preserving numeric indicators.
   * @private
   * @param {*} segment - Segment to coerce
   * @param {string|string[]} originalPath - Original path for error context
   * @param {string} operation - Operation name for error reporting
   * @returns {string} Validated segment string
   */
  _coerceSegment(segment, originalPath, operation) {
    if (typeof segment === 'string') {
      return segment;
    }

    if (typeof segment === 'number' && Number.isInteger(segment) && segment >= 0) {
      return String(segment);
    }

    throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
      'fieldPath',
      originalPath,
      `${operation} requires string segments or non-negative integers`
    );
  }

  /**
   * Ensure the target is traversable before performing write operations.
   * @private
   * @param {*} target - Target to validate
   */
  _assertTraversableTarget(target) {
    if (!this._isTraversable(target)) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'target',
        target,
        'Target must be an object when setting field values'
      );
    }
  }

  /**
   * Ensure the field path has at least one segment.
   * @private
   * @param {string[]} segments - Segments to validate
   * @param {string|string[]} fieldPath - Original field path for context
   */
  _assertNonEmptySegments(segments, fieldPath) {
    if (segments.length === 0) {
      throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT(
        'fieldPath',
        fieldPath,
        'Field path must contain at least one segment'
      );
    }
  }

  /**
   * Traverse to the parent container for the final segment, creating containers as required.
   * @private
   * @param {Object} target - Root document or object
   * @param {string[]} segments - Path segments
   * @returns {Object} Parent container for the final segment
   */
  _traverseToParent(target, segments) {
    let current = target;

    for (let i = 0; i < segments.length - 1; i++) {
      current = this._descendEnsuringContainer(current, segments[i], segments[i + 1]);
    }

    return current;
  }

  /**
   * Descend into the next container, initialising structures when required.
   * @private
   * @param {Object|Array} current - Current container
   * @param {string} segment - Current segment
   * @param {string} nextSegment - Upcoming segment to inform container type
   * @returns {Object|Array} Child container
   */
  _descendEnsuringContainer(current, segment, nextSegment) {
    if (Array.isArray(current)) {
      return this._descendArray(current, segment, nextSegment);
    }

    return this._descendObject(current, segment, nextSegment);
  }

  /**
   * Descend into an object container.
   * @private
   * @param {Object} current - Current object container
   * @param {string} segment - Current segment
   * @param {string} nextSegment - Upcoming segment to inform container type
   * @returns {Object|Array} Child container
   */
  _descendObject(current, segment, nextSegment) {
    if (!this._isTraversable(current[segment])) {
      current[segment] = this._createContainerForNext(nextSegment);
    }

    return current[segment];
  }

  /**
   * Descend into an array container.
   * @private
   * @param {Array} current - Current array container
   * @param {string} segment - Current segment
   * @param {string} nextSegment - Upcoming segment to inform container type
   * @returns {Object|Array} Child container
   */
  _descendArray(current, segment, nextSegment) {
    const index = this._asArrayIndex(segment);

    if (index === null) {
      if (!this._isTraversable(current[segment])) {
        current[segment] = this._createContainerForNext(nextSegment);
      }
      return current[segment];
    }

    if (!this._isTraversable(current[index])) {
      current[index] = this._createContainerForNext(nextSegment);
    }

    return current[index];
  }

  /**
   * Create a container based on the upcoming segment.
   * @private
   * @param {string} nextSegment - Upcoming segment to inspect
   * @returns {Object|Array} A new object or array container
   */
  _createContainerForNext(nextSegment) {
    return this._asArrayIndex(nextSegment) !== null ? [] : {};
  }

  /**
   * Assign the final segment value to the parent container.
   * @private
   * @param {Object|Array} container - Parent container
   * @param {string} segment - Final path segment
   * @param {*} value - Value to assign
   */
  _assignFinalSegment(container, segment, value) {
    const index = this._asArrayIndex(segment);

    if (Array.isArray(container) && index !== null) {
      container[index] = value;
      return;
    }

    container[segment] = value;
  }

  /**
   * Locate the parent container without creating new structures.
   * @private
   * @param {Object} target - Root document or object
   * @param {string[]} segments - Path segments
   * @returns {{container: Object|Array, segment: string}|null} Parent info or null when missing
   */
  _locateParent(target, segments) {
    let current = target;

    for (let i = 0; i < segments.length - 1; i++) {
      current = this._peekNext(current, segments[i]);
      if (!this._isTraversable(current)) {
        return null;
      }
    }

    return { container: current, segment: segments[segments.length - 1] };
  }

  /**
   * Remove the final segment from its container.
   * @private
   * @param {Object|Array} container - Parent container
   * @param {string} segment - Final segment
   */
  _removeFinalSegment(container, segment) {
    const index = this._asArrayIndex(segment);

    if (Array.isArray(container) && index !== null) {
      delete container[index];
      return;
    }

    if (this._isTraversable(container)) {
      delete container[segment];
    }
  }

  /**
   * Peek at the next value without creating containers.
   * @private
   * @param {Object|Array} current - Current container
   * @param {string} segment - Segment to access
   * @returns {*} The next value or undefined when absent
   */
  _peekNext(current, segment) {
    if (!this._isTraversable(current)) {
      return undefined;
    }

    const index = this._asArrayIndex(segment);

    if (Array.isArray(current) && index !== null) {
      return current[index];
    }

    return current[segment];
  }

  /**
   * Determine whether a segment is missing or empty.
   * @private
   * @param {string} segment - Segment to test
   * @returns {boolean} True when segment is empty
   */
  _isSegmentMissing(segment) {
    return segment === '' || segment === null || segment === undefined;
  }

  /**
   * Determine whether a segment targets prototype mutation.
   * @private
   * @param {string} segment - Segment to test
   * @returns {boolean} True when segment is unsafe
   */
  _isPrototypeSegment(segment) {
    return segment === '__proto__' || segment === 'constructor' || segment === 'prototype';
  }

  /**
   * Determine if a value is traversable (plain object or array).
   * @private
   * @param {*} value - Value to test
   * @returns {boolean} True when traversable
   */
  _isTraversable(value) {
    return value !== null && typeof value === 'object';
  }

  /**
   * Convert a segment into an array index when appropriate.
   * @private
   * @param {string} segment - Segment to inspect
   * @returns {number|null} Non-negative integer index or null when not numeric
   */
  _asArrayIndex(segment) {
    if (typeof segment !== 'string') {
      return null;
    }

    if (/^\d+$/.test(segment)) {
      return Number(segment);
    }

    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FieldPathUtils };
}
