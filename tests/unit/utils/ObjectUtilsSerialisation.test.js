/**
 * ObjectUtilsSerialisation.test.js - Vitest tests for ObjectUtils serialisation
 */

describe('ObjectUtils serialise', () => {
  it('should exist', () => {
    expect(typeof ObjectUtils.serialise).toBe('function');
  });

  it('should serialise simple objects', () => {
    const simpleObj = { name: 'test', value: 42, active: true };
    const serialised = ObjectUtils.serialise(simpleObj);

    expect(typeof serialised).toBe('string');

    const parsed = JSON.parse(serialised);
    expect(parsed.name).toBe('test');
    expect(parsed.value).toBe(42);
    expect(parsed.active).toBe(true);
  });

  it('should convert dates to ISO strings', () => {
    const dateObj = {
      created: new Date('2023-06-15T10:30:00.000Z'),
      name: 'Test Document'
    };

    const serialised = ObjectUtils.serialise(dateObj);
    const parsed = JSON.parse(serialised);
    expect(parsed.created).toBe('2023-06-15T10:30:00.000Z');
  });

  it('should serialise arrays with dates', () => {
    const arrayWithDates = [
      new Date('2023-01-01T00:00:00.000Z'),
      'string value',
      42,
      { timestamp: new Date('2023-12-31T23:59:59.999Z') }
    ];

    const serialised = ObjectUtils.serialise(arrayWithDates);
    const parsed = JSON.parse(serialised);
    expect(parsed[0]).toBe('2023-01-01T00:00:00.000Z');
    expect(parsed[3].timestamp).toBe('2023-12-31T23:59:59.999Z');
  });

  it('should handle null', () => {
    const serialisedNull = ObjectUtils.serialise(null);
    expect(serialisedNull).toBe('null');
  });

  it('should handle undefined input', () => {
    expect(ObjectUtils.serialise(undefined)).toBeUndefined();
  });

  it('should omit undefined properties and preserve nulls', () => {
    const objWithSpecialValues = {
      nullProp: null,
      undefinedProp: undefined,
      name: 'test'
    };

    const serialised = ObjectUtils.serialise(objWithSpecialValues);
    const parsed = JSON.parse(serialised);
    expect(parsed.nullProp).toBeNull();
    expect(parsed.name).toBe('test');
    expect(Object.prototype.hasOwnProperty.call(parsed, 'undefinedProp')).toBe(false);
  });
});

describe('ObjectUtils deserialise', () => {
  it('should exist', () => {
    expect(typeof ObjectUtils.deserialise).toBe('function');
  });

  it('should deserialise JSON strings', () => {
    const jsonString = '{"name":"test","value":42,"active":true}';
    const deserialised = ObjectUtils.deserialise(jsonString);

    expect(typeof deserialised).toBe('object');
    expect(deserialised.name).toBe('test');
    expect(deserialised.value).toBe(42);
    expect(deserialised.active).toBe(true);
  });

  it('should restore dates from ISO strings', () => {
    const jsonWithDates = '{"created":"2023-06-15T10:30:00.000Z","name":"Test"}';
    const deserialised = ObjectUtils.deserialise(jsonWithDates);

    expect(deserialised.created).toBeInstanceOf(Date);
    expect(deserialised.created.toISOString()).toBe('2023-06-15T10:30:00.000Z');
  });

  it('should restore arrays with dates', () => {
    const jsonArray =
      '["2023-01-01T00:00:00.000Z","string value",42,{"timestamp":"2023-12-31T23:59:59.999Z"}]';
    const deserialised = ObjectUtils.deserialise(jsonArray);

    expect(Array.isArray(deserialised)).toBe(true);
    expect(deserialised[0]).toBeInstanceOf(Date);
    expect(deserialised[1]).toBe('string value');
    expect(deserialised[2]).toBe(42);
    expect(deserialised[3].timestamp).toBeInstanceOf(Date);
  });

  it('should throw for invalid JSON', () => {
    expect(() => ObjectUtils.deserialise('invalid json')).toThrow(Error);
    expect(() => ObjectUtils.deserialise('{')).toThrow(Error);
  });

  it('should throw for non-string input', () => {
    expect(() => ObjectUtils.deserialise(42)).toThrow(InvalidArgumentError);
    expect(() => ObjectUtils.deserialise({})).toThrow(InvalidArgumentError);
    expect(() => ObjectUtils.deserialise(null)).toThrow(InvalidArgumentError);
    expect(() => ObjectUtils.deserialise(undefined)).toThrow(InvalidArgumentError);
  });
});

describe('ObjectUtils round-trip serialisation', () => {
  it('should preserve structure and dates', () => {
    const originalData = {
      user: {
        name: 'John Doe',
        created: new Date('2023-06-15T10:30:00.000Z')
      },
      tags: ['admin', 'premium']
    };

    const serialised = ObjectUtils.serialise(originalData);
    const deserialised = ObjectUtils.deserialise(serialised);

    expect(deserialised.user.name).toBe('John Doe');
    expect(deserialised.user.created).toBeInstanceOf(Date);
    expect(deserialised.user.created.getTime()).toBe(originalData.user.created.getTime());
    expect(deserialised.tags).toEqual(['admin', 'premium']);
  });
});

describe('ObjectUtils class revival', () => {
  it('should revive DatabaseConfig instances', () => {
    const originalConfig = new DatabaseConfig({
      rootFolderId: 'root123',
      autoCreateCollections: false,
      lockTimeout: 10000,
      cacheEnabled: false,
      logLevel: 'DEBUG',
      masterIndexKey: 'TEST_KEY',
      stripDisallowedCollectionNameCharacters: true
    });

    const serialised = ObjectUtils.serialise(originalConfig);
    const deserialised = ObjectUtils.deserialise(serialised);

    expect(deserialised).toBeInstanceOf(DatabaseConfig);
    expect(deserialised.rootFolderId).toBe(originalConfig.rootFolderId);
    expect(deserialised.autoCreateCollections).toBe(originalConfig.autoCreateCollections);
    expect(deserialised.lockTimeout).toBe(originalConfig.lockTimeout);
    expect(deserialised.cacheEnabled).toBe(originalConfig.cacheEnabled);
    expect(deserialised.logLevel).toBe(originalConfig.logLevel);
    expect(deserialised.masterIndexKey).toBe(originalConfig.masterIndexKey);
    expect(deserialised.stripDisallowedCollectionNameCharacters).toBe(true);
  });

  it('should revive CollectionMetadata instances', () => {
    const originalMeta = new CollectionMetadata('testCollection', 'file123', {
      created: new Date('2023-01-01T00:00:00.000Z'),
      lastUpdated: new Date('2023-06-15T10:30:00.000Z'),
      documentCount: 5,
      modificationToken: 'token123',
      lockStatus: null
    });

    const serialised = ObjectUtils.serialise(originalMeta);
    const deserialised = ObjectUtils.deserialise(serialised);

    expect(deserialised).toBeInstanceOf(CollectionMetadata);
    expect(deserialised.name).toBe('testCollection');
    expect(deserialised.fileId).toBe('file123');
    expect(deserialised.documentCount).toBe(5);
    expect(deserialised.modificationToken).toBe('token123');
    expect(deserialised.created).toBeInstanceOf(Date);
    expect(deserialised.lastUpdated).toBeInstanceOf(Date);
  });
});

describe('ObjectUtils round-trip variants', () => {
  it('should preserve DatabaseConfig sanitisation flag', () => {
    const originalConfig = new DatabaseConfig({
      rootFolderId: 'testRoot',
      stripDisallowedCollectionNameCharacters: true,
      cacheEnabled: false,
      logLevel: 'WARN'
    });

    const serialised = ObjectUtils.serialise(originalConfig);
    const deserialised = ObjectUtils.deserialise(serialised);

    expect(deserialised).toBeInstanceOf(DatabaseConfig);
    expect(deserialised.rootFolderId).toBe('testRoot');
    expect(deserialised.logLevel).toBe('WARN');
    expect(deserialised.cacheEnabled).toBe(false);
    expect(deserialised.stripDisallowedCollectionNameCharacters).toBe(true);
  });

  it('should round-trip complex structures with nulls and arrays', () => {
    const complexData = {
      nullValue: null,
      undefinedValue: undefined,
      emptyObject: {},
      emptyArray: [],
      nestedEmpty: { inner: { deeper: {} } },
      mixedArray: [
        null,
        'string',
        42,
        true,
        new Date('2023-06-15T10:30:00.000Z'),
        { nested: new Date('2023-12-25T15:45:30.000Z') }
      ]
    };

    const serialised = ObjectUtils.serialise(complexData);
    const deserialised = ObjectUtils.deserialise(serialised);

    expect(deserialised.nullValue).toBeNull();
    expect(deserialised.emptyObject).toEqual({});
    expect(Array.isArray(deserialised.emptyArray)).toBe(true);
    expect(deserialised.mixedArray[4]).toBeInstanceOf(Date);
    expect(deserialised.mixedArray[5].nested).toBeInstanceOf(Date);
    expect(Object.prototype.hasOwnProperty.call(deserialised, 'undefinedValue')).toBe(false);
  });

  it('should map NaN and Infinity to null during serialisation', () => {
    const specialNumbers = {
      nanValue: Number.NaN,
      infinityValue: Infinity,
      negativeInfinityValue: -Infinity,
      normalNumber: 42.5
    };

    const serialised = ObjectUtils.serialise(specialNumbers);
    const parsed = JSON.parse(serialised);

    expect(parsed.nanValue).toBeNull();
    expect(parsed.infinityValue).toBeNull();
    expect(parsed.negativeInfinityValue).toBeNull();
    expect(parsed.normalNumber).toBe(42.5);
  });
});
