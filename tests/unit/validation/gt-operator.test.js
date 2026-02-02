/**
 * $gt (Greater Than) Operator Validation Tests
 * 
 * Tests MongoDB-compatible $gt operator against ValidationMockData.
 * Covers:
 * - Numeric comparisons (integers, floats, mixed, negatives)
 * - Zero boundary cases
 * - Date comparisons
 * - String comparisons (lexicographical)
 * - Case sensitivity in string comparison
 * - Type mixing errors
 * - Null/undefined handling
 * - Missing fields
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupValidationTestEnvironment, cleanupValidationTests } from '../../helpers/validation-test-helpers.js';

let testEnv;

describe('$gt Greater Than Operator Tests', () => {
  beforeAll(() => {
    testEnv = setupValidationTestEnvironment();
  });

  afterAll(() => {
    cleanupValidationTests(testEnv);
  });
  describe('Numeric comparisons', () => {
    it('should compare integers correctly', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ age: { $gt: 40 } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(3);
      const ageIds = results.map(doc => doc._id);
      expect(ageIds).toContain('person3');
      expect(ageIds).toContain('person5');
      expect(ageIds).toContain('person6');
    });

    it('should compare floats correctly', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ score: { $gt: 90.0 } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
      const scoreIds = results.map(doc => doc._id);
      expect(scoreIds).toContain('person3');
      expect(scoreIds).toContain('person5');
    });

    it('should handle mixed integer and float comparison', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ score: { $gt: 80 } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(3);
      const scoreIds = results.map(doc => doc._id);
      expect(scoreIds).toContain('person1');
    });

    it('should handle negative numbers correctly', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ balance: { $gt: -200 } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(5);
      const balanceIds = results.map(doc => doc._id);
      expect(balanceIds).toContain('person3');
    });

    it('should handle zero boundary cases', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ balance: { $gt: 0 } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(4);
      results.forEach(doc => {
        expect(doc.balance).toBeGreaterThan(0);
      });
    });
  });

  describe('Date comparisons', () => {
    it('should compare Date objects chronologically', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      const cutoffDate = new Date('2025-06-20T00:00:00Z');
      
      // Act
      const results = collection.find({ lastLogin: { $gt: cutoffDate } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
      const recentIds = results.map(doc => doc._id);
      expect(recentIds).toContain('person4');
      expect(recentIds).toContain('person6');
    });
  });

  describe('String comparisons', () => {
    it('should compare strings lexicographically', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 'name.first': { $gt: 'D' } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
      const nameIds = results.map(doc => doc._id);
      expect(nameIds).toContain('person5');
      expect(nameIds).toContain('person6');
    });

    it('should handle case sensitivity in string comparison', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 'preferences.settings.theme': { $gt: 'dark' } });
      
      // Assert
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Type mixing errors', () => {
    it('should not compare number with string', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ age: { $gt: '30' } });
      
      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('Null/undefined handling', () => {
    it('should handle null values in comparison', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ lastLogin: { $gt: null } });
      
      // Assert
      expect(results).toHaveLength(0);
    });

    it('should handle missing fields in comparison', () => {
      // Arrange
      const collection = testEnv.collections.persons;
      
      // Act
      const results = collection.find({ 'nonexistent.field': { $gt: 0 } });
      
      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
