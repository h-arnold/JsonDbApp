/**
 * ObjectUtilsDeepClone.test.js - Vitest tests for ObjectUtils.deepClone
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
    expect(clonedDateArray[2].getTime()).toBe(dateArray[2].getTime());
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

describe('ObjectUtils deepClone edge cases', () => {
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
      method: function () {
        return 'test';
      }
    };

    const cloned = ObjectUtils.deepClone(objWithFunction);
    expect(cloned.name).toBe('test');
    expect(() => objWithFunction.method()).not.toThrow();

    const objWithRegex = {
      label: 'pattern',
      pattern: /test/gi
    };

    const clonedRegex = ObjectUtils.deepClone(objWithRegex);
    expect(clonedRegex.label).toBe('pattern');
    expect(clonedRegex).toHaveProperty('pattern');
  });

  it('should throw for circular references to avoid infinite recursion', () => {
    const obj = { name: 'test' };
    obj.self = obj;

    expect(() => ObjectUtils.deepClone(obj)).toThrow(RangeError);
  });
});
