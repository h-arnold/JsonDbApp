/**
 * Component Attribution Coverage for the Full Instrumentation Surface
 *
 * Completes PR_REVIEW.md decision I8: every instrumented
 * label carries the deliberate PascalCase `component` field. This suite covers
 * the labels whose attribution was previously unasserted; the remaining
 * labels are already enforced elsewhere — the nine `collection.*` boundaries in
 * collection-timing.test.js, `fileService.createFile`/`fileService.readFile` in
 * timing-instrumentation.test.js, and `docOps.applyToMatching` in
 * document-operations-update.test.js.
 *
 * Labels that sit beneath an outer timer in production flows (suppressed by the
 * stacked-timer short-circuit while the outer measurement is active) are driven
 * through the direct invocation path that makes them observable, per the review
 * decision.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { captureTimingEvents } from '../../helpers/timing-capture-test-helpers.js';
import {
  setupTestEnvironment,
  resetCollection
} from '../../helpers/document-operations-test-helpers.js';
import {
  cleanupMasterIndexTests,
  createTestMasterIndex
} from '../../helpers/master-index-test-helpers.js';
import {
  createTestCoordinator,
  createTestCollection as createCoordinatorTestCollection,
  resetCollectionState,
  setupCoordinatorTestEnvironment
} from '../../helpers/collection-coordinator-test-helpers.js';

/**
 * Builds a DocumentOperations context seeded with the given documents.
 * @param {Array<Object>} documents - Documents to insert into a fresh collection.
 * @returns {Object} Context holding the ready DocumentOperations instance.
 */
const createSeededDocOps = (documents) => {
  const env = setupTestEnvironment();
  resetCollection(env.collection);
  const docOps = new DocumentOperations(env.collection);
  for (const document of documents) {
    docOps.insertDocument(document);
  }
  return { docOps };
};

/**
 * Builds a CollectionCoordinator wired over a freshly reset test collection.
 * @param {string} collectionName - Unique name for the underlying collection.
 * @returns {Object} Context holding the ready coordinator.
 */
const createWiredCoordinator = (collectionName) => {
  const env = setupCoordinatorTestEnvironment();
  const { collection, fileId } = createCoordinatorTestCollection(env, collectionName);
  resetCollectionState(collection, fileId);
  return { coordinator: createTestCoordinator(collection, env.masterIndex) };
};

/**
 * One entry per §6 label whose component attribution still needs pinning.
 *
 * `arrange` builds every dependency so captures can start afterwards; `act`
 * drives the operation through the observable path; `verify` pins the
 * operation's own behavioural result so the suite stays behaviour-focused.
 */
const ATTRIBUTION_CASES = [
  {
    label: 'queryEngine.executeQuery',
    component: 'QueryEngine',
    /**
     * Builds an engine and a small document set.
     * @returns {Object} Engine and documents context.
     */
    arrange: () => ({
      engine: new QueryEngine(),
      documents: [
        { _id: 'a', group: 1 },
        { _id: 'b', group: 2 }
      ]
    }),
    /**
     * Runs a filtered query through the timed facade.
     * @param {Object} context - Arranged context.
     * @returns {Array<Object>} Matching documents.
     */
    act: (context) => context.engine.executeQuery(context.documents, { group: 1 }),
    /**
     * Verifies only the matching document came back.
     * @param {Array<Object>} results - Query results.
     * @returns {void}
     */
    verify: (results) => expect(results).toEqual([{ _id: 'a', group: 1 }])
  },
  {
    label: 'queryEngine.filterDocuments',
    component: 'QueryEngine',
    /**
     * Builds an engine and a small document set.
     * @returns {Object} Engine and documents context.
     */
    arrange: () => ({
      engine: new QueryEngine(),
      documents: [
        { _id: 'a', group: 1 },
        { _id: 'b', group: 2 }
      ]
    }),
    /**
     * Drives the matcher directly because executeQuery's outer timer would
     * otherwise short-circuit this inner label.
     * @param {Object} context - Arranged context.
     * @returns {Array<Object>} Matching documents.
     */
    act: (context) => context.engine._matcher.filterDocuments(context.documents, { group: 2 }),
    /**
     * Verifies only the matching document came back.
     * @param {Array<Object>} results - Matching documents.
     * @returns {void}
     */
    verify: (results) => expect(results).toEqual([{ _id: 'b', group: 2 }])
  },
  {
    label: 'docOps.executeQuery',
    component: 'DocumentOperations',
    /**
     * Seeds two categorised documents for the query scan.
     * @returns {Object} Seeded docOps context.
     */
    arrange: () =>
      createSeededDocOps([
        { _id: 'user-1', category: 'test' },
        { _id: 'user-2', category: 'other' }
      ]),
    /**
     * Runs a direct query scan (no bulk boundary above it).
     * @param {Object} context - Arranged context.
     * @returns {Array<Object>} Matching documents.
     */
    act: (context) => context.docOps.findMultipleByQuery({ category: 'test' }),
    /**
     * Verifies only the matching document came back.
     * @param {Array<Object>} results - Matching documents.
     * @returns {void}
     */
    verify: (results) => expect(results.map((doc) => doc._id)).toEqual(['user-1'])
  },
  {
    label: 'docOps.updateWithOperators',
    component: 'DocumentOperations',
    /**
     * Seeds one counter document for the operator update.
     * @returns {Object} Seeded docOps context.
     */
    arrange: () => createSeededDocOps([{ _id: 'counter-1', count: 1 }]),
    /**
     * Applies an operator batch directly to the document.
     * @param {Object} context - Arranged context.
     * @returns {Object} Acknowledged write result with counts.
     */
    act: (context) =>
      context.docOps.updateDocumentWithOperators('counter-1', { $inc: { count: 2 } }),
    /**
     * Verifies the write was acknowledged and applied once.
     * @param {Object} result - Write result.
     * @returns {void}
     */
    verify: (result) => expect(result.modifiedCount).toBe(1)
  },
  {
    label: 'updateEngine.applyOperators',
    component: 'UpdateEngine',
    /**
     * Builds a bare update engine.
     * @returns {Object} Engine context.
     */
    arrange: () => ({ engine: new UpdateEngine() }),
    /**
     * Applies a mixed operator batch directly to a document.
     * @param {Object} context - Arranged context.
     * @returns {Object} Updated document clone.
     */
    act: (context) =>
      context.engine.applyOperators(
        { count: 1 },
        { $set: { name: 'updated' }, $inc: { count: 2 } }
      ),
    /**
     * Verifies both operators were applied to the returned clone.
     * @param {Object} updatedDoc - Updated document.
     * @returns {void}
     */
    verify: (updatedDoc) => expect(updatedDoc).toEqual({ count: 3, name: 'updated' })
  },
  {
    label: 'masterIndex.save',
    component: 'MasterIndex',
    /**
     * Creates an isolated master index (its constructor bootstrap runs before capture).
     * @returns {Object} Master index context.
     */
    arrange: () => createTestMasterIndex(),
    /**
     * Persists the current index snapshot once.
     * @param {Object} context - Arranged context.
     * @returns {void} Save passes the wrapped result through unchanged.
     */
    act: (context) => context.masterIndex.save(),
    /**
     * Verifies save completes without a payload.
     * @param {void} result - Save result.
     * @returns {void}
     */
    verify: (result) => expect(result).toBeUndefined()
  },
  {
    label: 'coordinator.coordinate',
    component: 'CollectionCoordinator',
    /**
     * Wires a coordinator over a fresh collection.
     * @returns {Object} Coordinator context.
     */
    arrange: () => createWiredCoordinator('attributionCoordinate'),
    /**
     * Coordinates one trivial operation end to end.
     * @param {Object} context - Arranged context.
     * @returns {*} The callback's result.
     */
    act: (context) => context.coordinator.coordinate('attributionProbe', () => 'coordinated-ok'),
    /**
     * Verifies the coordinated result passes through untouched.
     * @param {*} result - Coordinated callback result.
     * @returns {void}
     */
    verify: (result) => expect(result).toBe('coordinated-ok')
  },
  {
    label: 'coordinator.updateMasterIndexMetadata',
    component: 'CollectionCoordinator',
    /**
     * Wires a coordinator over a fresh collection.
     * @returns {Object} Coordinator context.
     */
    arrange: () => createWiredCoordinator('attributionMetadataUpdate'),
    /**
     * Runs the metadata finalisation step directly because coordinate's outer
     * timer would otherwise short-circuit this inner label.
     * @param {Object} context - Arranged context.
     * @returns {void} The metadata update completes without a payload.
     */
    act: (context) => context.coordinator.updateMasterIndexMetadata(),
    /**
     * Verifies the metadata update completes without a payload.
     * @param {void} result - Update result.
     * @returns {void}
     */
    verify: (result) => expect(result).toBeUndefined()
  }
];

describe('Instrumented label component attribution', () => {
  let capture;

  afterEach(() => {
    if (capture) {
      capture.restore();
    }
    cleanupMasterIndexTests();
  });

  ATTRIBUTION_CASES.forEach(({ label, component, arrange, act, verify }) => {
    it(`attributes ${label} events to the ${component} component`, () => {
      // Arrange — capture starts after arrange so setup emissions stay out.
      const context = arrange();
      capture = captureTimingEvents();

      // Act
      const result = act(context);

      // Assert — attribution holds for every captured event, not just the first.
      verify(result);
      expect(capture.events.length, `expected at least one ${label} timing event`).toBeGreaterThan(
        0
      );
      expect(capture.events.map((event) => event.label)).toContain(label);
      for (const event of capture.events) {
        expect(event.component).toBe(component);
        expect(typeof event.durationMs).toBe('number');
        expect(event.durationMs).toBeGreaterThanOrEqual(0);
        expect(event.error).toBeNull();
      }
    });
  });
});
