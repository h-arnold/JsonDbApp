import '../setup/gas-mocks.setup.js';

/**
 * Builds a database seeded with ValidationMockData to mirror legacy validation suites.
 * @returns {{database: Database, persons: Collection, orders: Collection, inventory: Collection}}
 */
export function createValidationDatabase() {
  const config = new DatabaseConfig({
    rootFolderId: DriveApp.createFolder(`VITEST_VALIDATION_${Date.now()}`).getId(),
    masterIndexKey: `VITEST_VALIDATION_MI_${Date.now()}`
  });

  const database = new Database(config);
  database.createDatabase();
  database.initialise();

  const seedCollection = (name, documents) => {
    const collection = database.getCollection(name, { autoCreate: true });
    documents.forEach((doc) => collection.insertOne(ObjectUtils.deepClone(doc)));
    return collection;
  };

  const persons = seedCollection('persons', ValidationMockData.getPersons());
  const orders = seedCollection('orders', ValidationMockData.getOrders());
  const inventory = seedCollection('inventory', ValidationMockData.getInventory());

  return { database, persons, orders, inventory };
}
