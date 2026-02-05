/**
 * ObjectUtilsDateConversion.test.js - Vitest tests for ObjectUtils date conversions
 */

const VALID_ISO_STRINGS = [
  '2023-01-01T00:00:00.000Z',
  '2023-06-15T10:30:00.000Z',
  '1990-01-01T00:00:00.000Z',
  '2024-12-31T23:59:59.999Z',
  '2023-06-15T10:30:00Z',
  '2000-02-29T12:00:00.000Z'
];

const NON_ISO_DATE_STRINGS = [
  '2023-06-15 10:30:00',
  '15/06/2023',
  '2023-13-01T00:00:00.000Z',
  '2023-06-32T00:00:00.000Z',
  '2023-06-15T25:00:00.000Z',
  '2023-06-15T10:30:00',
  '2023-06-15T10:30:00+00:00',
  'not a date at all',
  '2023',
  '',
  'null',
  'undefined'
];

const INVALID_ISO_VARIANTS = [
  '2023-06-15T10:30:00.000',
  '2023-06-15 10:30:00.000Z',
  '2023-06-15T10:60:00.000Z',
  '2023-06-15T10:30:60.000Z',
  '23-06-15T10:30:00.000Z',
  '2023-6-15T10:30:00.000Z',
  '2023-06-5T10:30:00.000Z',
  '2023-06-15T1:30:00.000Z',
  'not-a-date-at-all'
];

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
    VALID_ISO_STRINGS.forEach((isoString) => {
      const converted = ObjectUtils.convertDateStringsToObjects(isoString);
      expect(converted).toBeInstanceOf(Date);
      expect(converted.getTime()).toBe(new Date(isoString).getTime());
    });
  });

  it('should preserve non-ISO strings', () => {
    NON_ISO_DATE_STRINGS.forEach((str) => {
      const result = ObjectUtils.convertDateStringsToObjects(str);
      expect(typeof result).toBe('string');
      expect(result).toBe(str);
    });
  });

  it('should reject invalid ISO variants', () => {
    INVALID_ISO_VARIANTS.forEach((str) => {
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
      '2023-12-31T23:59:59.999Z',
      null,
      undefined
    ];

    const converted = ObjectUtils.convertDateStringsToObjects(mixedArray);

    expect(converted[0]).toBeInstanceOf(Date);
    expect(converted[1]).toBe('regular string');
    expect(converted[2]).toBeInstanceOf(Date);
    expect(converted[3]).toBe(42);
    expect(converted[4]).toBeInstanceOf(Date);
    expect(converted[5]).toBeNull();
    expect(converted[6]).toBeUndefined();
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
          personal: {
            birthDate: '1990-05-15T00:00:00.000Z',
            name: 'John Doe',
            preferences: {
              lastLogin: '2024-06-11T10:00:00.000Z',
              invalidDate: '2023-06-15 10:30:00'
            }
          },
          events: [
            { date: '2023-01-01T00:00:00.000Z', type: 'start' },
            { date: '2023-06-01T12:00:00.000Z', type: 'middle' },
            { date: 'not a date', type: 'invalid' }
          ]
        }
      },
      metadata: {
        timestamps: ['2023-03-15T09:30:00.000Z', '2023-09-22T16:45:00.000Z', 'invalid timestamp']
      }
    };

    const converted = ObjectUtils.convertDateStringsToObjects(nestedObj);

    expect(converted.user.created).toBeInstanceOf(Date);
    expect(converted.user.profile.personal.birthDate).toBeInstanceOf(Date);
    expect(converted.user.profile.personal.name).toBe('John Doe');
    expect(converted.user.profile.personal.preferences.lastLogin).toBeInstanceOf(Date);
    expect(typeof converted.user.profile.personal.preferences.invalidDate).toBe('string');
    expect(converted.user.profile.events[0].date).toBeInstanceOf(Date);
    expect(converted.user.profile.events[1].date).toBeInstanceOf(Date);
    expect(typeof converted.user.profile.events[2].date).toBe('string');
    expect(converted.metadata.timestamps[0]).toBeInstanceOf(Date);
    expect(converted.metadata.timestamps[1]).toBeInstanceOf(Date);
    expect(typeof converted.metadata.timestamps[2]).toBe('string');
  });
});
