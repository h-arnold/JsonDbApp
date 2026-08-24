/**
 * Collection Timing Tests
 *
 * Boundary instrumentation contract for the public Collection CRUD surface.
 * Each timed operation must emit a JDbLogger timing event labelled
 * `collection.<operation>` attributed to component 'Collection'; happy-path
 * events carry numeric non-negative durations and null errors; wrapping leaves
 * return values unchanged; and `aggregate` remains deliberately untimed.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { captureTimingEvents, eventsWithLabel } from '../../helpers/timing-capture-test-helpers.js';
import {
  assertAcknowledgedWrite,
  createIsolatedTestCollection,
  seedStandardEmployees
} from '../../helpers/collection-test-helpers.js';

/**
 * One entry per timed public CRUD operation.
 *
 * `drive` invokes the operation against a seeded collection so each test
 * exercises the real call path over the GAS mocks.
 */
const TIMED_OPERATIONS = [
  {
    operation: 'find',
    /**
     * Drives Collection.find over the engineering department.
     * @param {Object} collection - Seeded Collection instance under test.
     * @returns {Array<Object>} Matching employee documents.
     */
    drive: (collection) => collection.find({ department: 'Engineering' })
  },
  {
    operation: 'findOne',
    /**
     * Drives Collection.findOne over a seeded employee name.
     * @param {Object} collection - Seeded Collection instance under test.
     * @returns {Object|null} The first matching document or null.
     */
    drive: (collection) => collection.findOne({ name: 'Alice' })
  },
  {
    operation: 'countDocuments',
    /**
     * Drives Collection.countDocuments over the engineering department.
     * @param {Object} collection - Seeded Collection instance under test.
     * @returns {number} Number of matching documents.
     */
    drive: (collection) => collection.countDocuments({ department: 'Engineering' })
  },
  {
    operation: 'insertOne',
    /**
     * Drives Collection.insertOne with a fresh employee document.
     * @param {Object} collection - Seeded Collection instance under test.
     * @returns {Object} Acknowledged write result carrying insertedId.
     */
    drive: (collection) =>
      collection.insertOne({ name: 'Dana', department: 'Design', salary: 60000 })
  },
  {
    operation: 'updateOne',
    /**
     * Drives Collection.updateOne against Alice by identifier.
     * @param {Object} collection - Seeded Collection instance under test.
     * @param {Object} employeeIds - Inserted employee IDs from seedStandardEmployees.
     * @returns {Object} Acknowledged write result with match/modified counts.
     */
    drive: (collection, employeeIds) =>
      collection.updateOne({ _id: employeeIds.aliceId }, { $set: { salary: 76000 } })
  },
  {
    operation: 'updateMany',
    /**
     * Drives Collection.updateMany across the engineering department.
     * @param {Object} collection - Seeded Collection instance under test.
     * @returns {Object} Acknowledged write result with match/modified counts.
     */
    drive: (collection) =>
      collection.updateMany({ department: 'Engineering' }, { $inc: { salary: 1000 } })
  },
  {
    operation: 'replaceOne',
    /**
     * Drives Collection.replaceOne against Bob by identifier.
     * @param {Object} collection - Seeded Collection instance under test.
     * @param {Object} employeeIds - Inserted employee IDs from seedStandardEmployees.
     * @returns {Object} Acknowledged write result with match/modified counts.
     */
    drive: (collection, employeeIds) =>
      collection.replaceOne(
        { _id: employeeIds.bobId },
        { name: 'Robert', department: 'Marketing', salary: 66000 }
      )
  },
  {
    operation: 'deleteOne',
    /**
     * Drives Collection.deleteOne against Charlie by identifier.
     * @param {Object} collection - Seeded Collection instance under test.
     * @param {Object} employeeIds - Inserted employee IDs from seedStandardEmployees.
     * @returns {Object} Acknowledged write result carrying deletedCount.
     */
    drive: (collection, employeeIds) => collection.deleteOne({ _id: employeeIds.charlieId })
  },
  {
    operation: 'deleteMany',
    /**
     * Drives Collection.deleteMany over the marketing department.
     * @param {Object} collection - Seeded Collection instance under test.
     * @returns {Object} Acknowledged write result carrying deletedCount.
     */
    drive: (collection) => collection.deleteMany({ department: 'Marketing' })
  }
];

describe('Collection boundary timing instrumentation', () => {
  let capture;

  beforeEach(() => {
    capture = captureTimingEvents();
  });

  afterEach(() => {
    capture.restore();
  });

  describe('timed CRUD operations', () => {
    TIMED_OPERATIONS.forEach(({ operation, drive }) => {
      it(`emits ${operation} timings under the exact label collection.${operation} attributed to Collection`, () => {
        // Arrange
        const expectedLabel = `collection.${operation}`;
        const { collection } = createIsolatedTestCollection(`timing${operation}`);
        const employeeIds = seedStandardEmployees(collection);

        // Act
        drive(collection, employeeIds);

        // Assert
        const emitted = eventsWithLabel(capture.events, expectedLabel);
        expect(emitted.length, `no ${expectedLabel} timing events were captured`).toBeGreaterThan(
          0
        );
        for (const event of emitted) {
          expect(event.component).toBe('Collection');
          expect(event.label).toBe(expectedLabel);
        }
      });
    });
  });

  describe('happy-path event shape', () => {
    it('records numeric non-negative durations and null errors on every captured event', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('timingHappyPathShape');
      const employeeIds = seedStandardEmployees(collection);

      // Act
      for (const { drive } of TIMED_OPERATIONS) {
        drive(collection, employeeIds);
      }

      // Assert
      expect(
        capture.events.length,
        'no timing events were captured for the happy paths'
      ).toBeGreaterThan(0);
      for (const event of capture.events) {
        expect(typeof event.durationMs).toBe('number');
        expect(event.durationMs).toBeGreaterThanOrEqual(0);
        expect(event.error).toBeNull();
      }
    });
  });

  describe('return value transparency', () => {
    it('returns matching documents unchanged from find', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('timingFindTransparency');
      seedStandardEmployees(collection);

      // Act
      const results = collection.find({ department: 'Engineering' });

      // Assert
      expect(results).toHaveLength(2);
      const names = results.map((doc) => doc.name).sort();
      expect(names).toEqual(['Alice', 'Charlie']);
      for (const doc of results) {
        expect(doc.department).toBe('Engineering');
      }
    });

    it('round-trips insertOne through find unchanged', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('timingInsertRoundTrip');
      const document = { name: 'Dana', department: 'Design', salary: 60000 };

      // Act
      const insertResult = collection.insertOne(document);
      const found = collection.find({ _id: insertResult.insertedId });

      // Assert
      assertAcknowledgedWrite(insertResult);
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject(document);
      expect(found[0]._id).toBe(insertResult.insertedId);
    });
  });

  describe('aggregate non-instrumentation', () => {
    it('emits no collection-labelled timing events when aggregate runs', () => {
      // Arrange
      const { collection } = createIsolatedTestCollection('timingAggregateSilence');
      seedStandardEmployees(collection);

      // Act
      const results = collection.aggregate([{ $match: { department: 'Engineering' } }]);

      // Assert
      expect(results).toHaveLength(2);
      expect(
        eventsWithLabel(capture.events, 'collection.aggregate'),
        'aggregate must not emit any collection.aggregate timing events'
      ).toEqual([]);
    });
  });
});
