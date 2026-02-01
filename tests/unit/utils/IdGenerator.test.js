/**
 * IdGenerator.test.js - Vitest tests for IdGenerator
 */

describe('IdGenerator basic functionality', () => {
  it('should have generator methods', () => {
    expect(typeof IdGenerator.generateUUID).toBe('function');
    expect(typeof IdGenerator.generateTimestampId).toBe('function');
    expect(typeof IdGenerator.generateShortId).toBe('function');
  });
});

describe('IdGenerator uniqueness', () => {
  it('should generate unique UUIDs', () => {
    const id1 = IdGenerator.generateUUID();
    const id2 = IdGenerator.generateUUID();
    expect(id1).not.toBe(id2);
  });

  it('should generate unique timestamp IDs', () => {
    const timestampId1 = IdGenerator.generateTimestampId();
    const timestampId2 = IdGenerator.generateTimestampId();
    expect(timestampId1).not.toBe(timestampId2);
  });
});

describe('IdGenerator formats', () => {
  it('should validate UUID format', () => {
    const uuid = IdGenerator.generateFallbackUUID();
    expect(IdGenerator.isValidUUID(uuid)).toBe(true);
  });

  it('should generate and validate ObjectId', () => {
    const objectId = IdGenerator.generateObjectId();
    expect(IdGenerator.isValidObjectId(objectId)).toBe(true);
    expect(objectId.length).toBe(24);
  });

  it('should generate short ID with specified length', () => {
    const shortId = IdGenerator.generateShortId(8);
    expect(shortId.length).toBe(8);
  });
});

describe('IdGenerator custom generator', () => {
  it('should create custom generator with length', () => {
    const customGen = IdGenerator.createCustomGenerator({ type: 'short', length: 6 });
    const customId = customGen();
    expect(customId.length).toBe(6);
  });

  it('should create custom generator with prefix', () => {
    const prefixGen = IdGenerator.createCustomGenerator({ type: 'timestamp', prefix: 'test' });
    const prefixId = prefixGen();
    expect(prefixId.startsWith('test_')).toBe(true);
  });
});
