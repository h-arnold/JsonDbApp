/**
 * ObjectUtils.test.js - Vitest tests for ObjectUtils
 */

describe('ObjectUtils deepClone primitives', () => {
  it('should clone null and undefined', () => {
    expect(ObjectUtils.deepClone(null)).toBeNull();
    expect(ObjectUtils.deepClone(undefined)).toBeUndefined();
  });

  it('should clone primitive types', () => {
    expect(ObjectUtils.deepClone('test')).toBe('test');
    expect(ObjectUtils.deepClone(42)).toBe(42);
    expect(ObjectUtils.deepClone(true)).toBe(true);
    expect(ObjectUtils.deepClone(false)).toBe(false);
    expect(ObjectUtils.deepClone(0)).toBe(0);
    expect(ObjectUtils.deepClone('')).toBe('');
  });
});

describe('ObjectUtils deepClone dates', () => {
  it('should preserve Date objects', () => {
    const originalDate = new Date('2023-06-15T10:30:00.000Z');
    const clonedDate = ObjectUtils.deepClone(originalDate);
    
    expect(clonedDate).toBeInstanceOf(Date);
    expect(clonedDate.getTime()).toBe(originalDate.getTime());
    expect(clonedDate).not.toBe(originalDate);
  });

  it('should clone various date values', () => {
    const dates = [
      new Date('1990-01-01T00:00:00.000Z'),
      new Date('2024-12-31T23:59:59.999Z'),
      new Date()
    ];
    
    dates.forEach((date) => {
      const cloned = ObjectUtils.deepClone(date);
      expect(cloned).toBeInstanceOf(Date);
      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date);
    });
  });
});

describe('ObjectUtils deepClone arrays', () => {
  it('should clone empty array', () => {
    const emptyArray = [];
    const clonedEmpty = ObjectUtils.deepClone(emptyArray);
    expect(Array.isArray(clonedEmpty)).toBe(true);
    expect(clonedEmpty.length).toBe(0);
    expect(clonedEmpty).not.toBe(emptyArray);
  });

  it('should clone simple array', () => {
    const simpleArray = [1, 'test', true, null];
    const clonedSimple = ObjectUtils.deepClone(simpleArray);
    expect(clonedSimple).toEqual(simpleArray);
    expect(clonedSimple).not.toBe(simpleArray);
  });

  it('should clone array with dates', () => {
    const dateArray = [
      new Date('2023-01-01T00:00:00.000Z'),
      'string',
      new Date('2023-12-31T23:59:59.999Z')
    ];
    const clonedDateArray = ObjectUtils.deepClone(dateArray);
    
    expect(clonedDateArray.length).toBe(3);
    expect(clonedDateArray[0]).toBeInstanceOf(Date);
    expect(clonedDateArray[1]).toBe('string');
    expect(clonedDateArray[2]).toBeInstanceOf(Date);
    expect(clonedDateArray[0].getTime()).toBe(dateArray[0].getTime());
  });

  it('should clone nested arrays', () => {
    const nestedArray = [
      [1, 2, 3],
      ['a', 'b'],
      [new Date('2023-06-15T10:30:00.000Z'), true]
    ];
    const clonedNested = ObjectUtils.deepClone(nestedArray);
    
    expect(clonedNested.length).toBe(3);
    expect(clonedNested[0]).toEqual([1, 2, 3]);
    expect(clonedNested[2][0]).toBeInstanceOf(Date);
    expect(clonedNested).not.toBe(nestedArray);
    expect(clonedNested[0]).not.toBe(nestedArray[0]);
  });
});

describe('ObjectUtils deepClone objects', () => {
  it('should clone empty object', () => {
    const emptyObj = {};
    const clonedEmpty = ObjectUtils.deepClone(emptyObj);
    expect(Object.keys(clonedEmpty).length).toBe(0);
    expect(clonedEmpty).not.toBe(emptyObj);
  });

  it('should clone simple object', () => {
    const simpleObj = { name: 'test', value: 42, active: true };
    const clonedSimple = ObjectUtils.deepClone(simpleObj);
    expect(clonedSimple.name).toBe('test');
    expect(clonedSimple.value).toBe(42);
    expect(clonedSimple.active).toBe(true);
    expect(clonedSimple).not.toBe(simpleObj);
  });

  it('should clone object with dates', () => {
    const dateObj = {
      created: new Date('2023-01-01T00:00:00.000Z'),
      updated: new Date('2023-06-15T10:30:00.000Z'),
      name: 'test document'
    };
    const clonedDateObj = ObjectUtils.deepClone(dateObj);
    
    expect(clonedDateObj.created).toBeInstanceOf(Date);
    expect(clonedDateObj.updated).toBeInstanceOf(Date);
    expect(clonedDateObj.name).toBe('test document');
    expect(clonedDateObj.created.getTime()).toBe(dateObj.created.getTime());
  });
});

describe('ObjectUtils deepClone complex structures', () => {
  it('should clone deeply nested structures', () => {
    const complexObj = {
      user: {
        id: 'user123',
        profile: {
          personal: {
            name: 'John Doe',
            birthDate: new Date('1990-05-15T00:00:00.000Z'),
            preferences: {
              timezone: 'UTC',
              lastLogin: new Date('2024-06-11T10:00:00.000Z')
            }
          },
          professional: {
            department: 'Engineering',
            startDate: new Date('2020-01-15T09:00:00.000Z'),
            skills: ['JavaScript', 'Python', 'GAS']
          }
        }
      }
    };
    
    const cloned = ObjectUtils.deepClone(complexObj);
    
    expect(cloned.user.id).toBe('user123');
    expect(cloned.user.profile.personal.name).toBe('John Doe');
    expect(cloned.user.profile.personal.birthDate).toBeInstanceOf(Date);
    expect(cloned.user.profile.professional.skills).toEqual(['JavaScript', 'Python', 'GAS']);
    expect(cloned).not.toBe(complexObj);
    expect(cloned.user).not.toBe(complexObj.user);
  });
});

describe('ObjectUtils convertDateStringsToObjects', () => {
  it('should preserve null and undefined', () => {
    expect(ObjectUtils.convertDateStringsToObjects(null)).toBeNull();
    expect(ObjectUtils.convertDateStringsToObjects(undefined)).toBeUndefined();
  });

  it('should preserve non-date types', () => {
    expect(ObjectUtils.convertDateStringsToObjects('regular string')).toBe('regular string');
    expect(ObjectUtils.convertDateStringsToObjects(42)).toBe(42);
    expect(ObjectUtils.convertDateStringsToObjects(true)).toBe(true);
  });

  it('should convert valid ISO strings', () => {
    const isoString = '2023-06-15T10:30:00.000Z';
    const converted = ObjectUtils.convertDateStringsToObjects(isoString);
    expect(converted).toBeInstanceOf(Date);
    expect(converted.getTime()).toBe(new Date(isoString).getTime());
  });

  it('should preserve non-ISO strings', () => {
    const nonISO = [
      '2023-06-15 10:30:00',
      '15/06/2023',
      'not a date'
    ];
    
    nonISO.forEach((str) => {
      const result = ObjectUtils.convertDateStringsToObjects(str);
      expect(typeof result).toBe('string');
      expect(result).toBe(str);
    });
  });

  it('should preserve existing dates', () => {
    const existingDate = new Date('2023-06-15T10:30:00.000Z');
    const result = ObjectUtils.convertDateStringsToObjects(existingDate);
    expect(result).toBeInstanceOf(Date);
    expect(result).toBe(existingDate);
  });

  it('should convert arrays with mixed content', () => {
    const mixedArray = [
      '2023-06-15T10:30:00.000Z',
      'regular string',
      new Date('2023-01-01T00:00:00.000Z'),
      42,
      null
    ];
    
    const converted = ObjectUtils.convertDateStringsToObjects(mixedArray);
    
    expect(converted[0]).toBeInstanceOf(Date);
    expect(converted[1]).toBe('regular string');
    expect(converted[2]).toBeInstanceOf(Date);
    expect(converted[3]).toBe(42);
    expect(converted[4]).toBeNull();
    expect(converted).toBe(mixedArray);
  });

  it('should convert objects with mixed properties', () => {
    const mixedObj = {
      validDate: '2023-06-15T10:30:00.000Z',
      invalidDate: '2023-06-15 10:30:00',
      existingDate: new Date('2023-01-01T00:00:00.000Z'),
      regularString: 'test',
      number: 42
    };
    
    const converted = ObjectUtils.convertDateStringsToObjects(mixedObj);
    
    expect(converted.validDate).toBeInstanceOf(Date);
    expect(typeof converted.invalidDate).toBe('string');
    expect(converted.existingDate).toBeInstanceOf(Date);
    expect(converted.regularString).toBe('test');
    expect(converted.number).toBe(42);
    expect(converted).toBe(mixedObj);
  });

  it('should convert nested structures', () => {
    const nestedObj = {
      user: {
        created: '2023-01-01T00:00:00.000Z',
        profile: {
          birthDate: '1990-05-15T00:00:00.000Z',
          name: 'John Doe'
        }
      }
    };
    
    const converted = ObjectUtils.convertDateStringsToObjects(nestedObj);
    
    expect(converted.user.created).toBeInstanceOf(Date);
    expect(converted.user.profile.birthDate).toBeInstanceOf(Date);
    expect(converted.user.profile.name).toBe('John Doe');
  });
});

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
      42
    ];
    
    const serialised = ObjectUtils.serialise(arrayWithDates);
    const parsed = JSON.parse(serialised);
    expect(parsed[0]).toBe('2023-01-01T00:00:00.000Z');
  });

  it('should handle null', () => {
    const serialisedNull = ObjectUtils.serialise(null);
    expect(serialisedNull).toBe('null');
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
    const jsonArray = '["2023-01-01T00:00:00.000Z","string value",42]';
    const deserialised = ObjectUtils.deserialise(jsonArray);
    
    expect(Array.isArray(deserialised)).toBe(true);
    expect(deserialised[0]).toBeInstanceOf(Date);
    expect(deserialised[1]).toBe('string value');
  });

  it('should throw for invalid JSON', () => {
    expect(() => ObjectUtils.deserialise('invalid json')).toThrow(Error);
    expect(() => ObjectUtils.deserialise('{')).toThrow(Error);
  });

  it('should throw for non-string input', () => {
    expect(() => ObjectUtils.deserialise(42)).toThrow(InvalidArgumentError);
    expect(() => ObjectUtils.deserialise({})).toThrow(InvalidArgumentError);
    expect(() => ObjectUtils.deserialise(null)).toThrow(InvalidArgumentError);
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

describe('ObjectUtils edge cases', () => {
  /** @test */
  it('should handle large objects', () => {
    const largeObj = {};
    for (let i = 0; i < 1000; i++) {
      largeObj[`property${i}`] = `value${i}`;
    }
    
    const cloned = ObjectUtils.deepClone(largeObj);
    expect(Object.keys(cloned).length).toBe(1000);
  });

  /** @test */
  it('should handle special object types', () => {
    const objWithFunction = {
      name: 'test',
      /** Returns test string
       * @returns {string} Test */
      method: function() { return 'test'; }
    };
    
    const cloned = ObjectUtils.deepClone(objWithFunction);
    expect(cloned.name).toBe('test');
  });
});
