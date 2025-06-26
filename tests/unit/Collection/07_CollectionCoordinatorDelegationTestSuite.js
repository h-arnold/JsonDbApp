/**
 * 07_CollectionCoordinatorDelegationTestSuite.js
 *
 * Unit tests for verifying that Collection delegates CRUD operations to the injected coordinator.
 *
 *
 */

const collectionCoordinatorDelegationSuite = new TestSuite('CollectionCoordinatorDelegation');
let masterIndex, collectionCoordinator, collection;

collectionCoordinatorDelegationSuite.setBeforeEach(function() {
  const databaseConfig = new DatabaseConfig({ name: 'test_delegation_collection' });
  const logger = new JDbLogger('test_delegation_collection');
  masterIndex = new MasterIndex(databaseConfig, logger);
  
  // Create a minimal collection mock that satisfies the coordinator's validation
  const mockCollection = {
    getName: () => 'test_delegation_collection',
    _metadata: {
      documentCount: 0,
      getModificationToken: () => 'test-token'
    }
  };
  
  collectionCoordinator = new CollectionCoordinator(mockCollection, masterIndex, databaseConfig, logger);
  collection = new Collection(databaseConfig, logger, collectionCoordinator);
  
  // Update the coordinator's collection reference to the real collection
  collectionCoordinator._collection = collection;
  
  try { collection.deleteMany({}); } catch (error) {}
});

collectionCoordinatorDelegationSuite.setAfterEach(function() {
  try { collection.deleteMany({}); } catch (error) {}
});

collectionCoordinatorDelegationSuite.addTest('testInsertOneDelegatesToCoordinator', () => {
  let wasDelegated = false;
  const originalCoordinate = collectionCoordinator.coordinate;
  collectionCoordinator.coordinate = function(operation, callback) { wasDelegated = true; return originalCoordinate.call(this, operation, callback); };
  collection.insertOne({ foo: 'bar' });
  AssertionUtilities.assertTrue(wasDelegated, 'insertOne should delegate to coordinator');
  collectionCoordinator.coordinate = originalCoordinate;
});

collectionCoordinatorDelegationSuite.addTest('testFindOneDelegatesToCoordinator', () => {
  let wasDelegated = false;
  const originalCoordinate = collectionCoordinator.coordinate;
  collectionCoordinator.coordinate = function(operation, callback) { wasDelegated = true; return originalCoordinate.call(this, operation, callback); };
  collection.findOne({ foo: 'bar' });
  AssertionUtilities.assertTrue(wasDelegated, 'findOne should delegate to coordinator');
  collectionCoordinator.coordinate = originalCoordinate;
});

collectionCoordinatorDelegationSuite.addTest('testUpdateOneDelegatesToCoordinator', () => {
  let wasDelegated = false;
  const originalCoordinate = collectionCoordinator.coordinate;
  collectionCoordinator.coordinate = function(operation, callback) { wasDelegated = true; return originalCoordinate.call(this, operation, callback); };
  collection.updateOne({ foo: 'bar' }, { $set: { foo: 'baz' } });
  AssertionUtilities.assertTrue(wasDelegated, 'updateOne should delegate to coordinator');
  collectionCoordinator.coordinate = originalCoordinate;
});

collectionCoordinatorDelegationSuite.addTest('testDeleteOneDelegatesToCoordinator', () => {
  let wasDelegated = false;
  const originalCoordinate = collectionCoordinator.coordinate;
  collectionCoordinator.coordinate = function(operation, callback) { wasDelegated = true; return originalCoordinate.call(this, operation, callback); };
  collection.deleteOne({ foo: 'bar' });
  AssertionUtilities.assertTrue(wasDelegated, 'deleteOne should delegate to coordinator');
  collectionCoordinator.coordinate = originalCoordinate;
});

collectionCoordinatorDelegationSuite.addTest('testCollectionConstructorInjectsCoordinator', () => {
  AssertionUtilities.assertEquals(collection._coordinator, collectionCoordinator, 'Constructor should inject coordinator');
});

function createCollectionCoordinatorDelegationTestSuite() {
  return collectionCoordinatorDelegationSuite;
}

