/**
 * Validation.test.js - Vitest tests for Validate utility
 */

describe('Validate required', () => {
  it('should pass for valid values', () => {
    expect(() => Validate.required('string', 'param')).not.toThrow();
    expect(() => Validate.required(0, 'param')).not.toThrow();
    expect(() => Validate.required(false, 'param')).not.toThrow();
    expect(() => Validate.required([], 'param')).not.toThrow();
    expect(() => Validate.required({}, 'param')).not.toThrow();
  });

  it('should throw for null or undefined', () => {
    expect(() => Validate.required(null, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.required(undefined, 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate type', () => {
  it('should validate types correctly', () => {
    expect(() => Validate.type('string', 'string', 'param')).not.toThrow();
    expect(() => Validate.type(123, 'number', 'param')).not.toThrow();
    expect(() => Validate.type(true, 'boolean', 'param')).not.toThrow();
    expect(() => Validate.type({}, 'object', 'param')).not.toThrow();
    expect(() => Validate.type(function () {}, 'function', 'param')).not.toThrow();
  });

  it('should throw for wrong types', () => {
    expect(() => Validate.type('string', 'number', 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.type(123, 'string', 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate string', () => {
  it('should validate non-empty strings', () => {
    expect(() => Validate.nonEmptyString('test', 'param')).not.toThrow();
    expect(() => Validate.nonEmptyString('a', 'param')).not.toThrow();
    expect(() => Validate.nonEmptyString('  test  ', 'param')).not.toThrow();
  });

  it('should throw for empty or invalid strings', () => {
    expect(() => Validate.nonEmptyString('', 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.nonEmptyString('   ', 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.nonEmptyString(null, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.nonEmptyString(123, 'param')).toThrow(InvalidArgumentError);
  });

  it('should validate any string', () => {
    expect(() => Validate.string('test', 'param')).not.toThrow();
    expect(() => Validate.string('', 'param')).not.toThrow();
    expect(() => Validate.string('   ', 'param')).not.toThrow();
  });

  it('should throw for non-strings', () => {
    expect(() => Validate.string(123, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.string(null, 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate object', () => {
  it('should validate objects', () => {
    expect(() => Validate.object({}, 'param')).not.toThrow();
    expect(() => Validate.object({ key: 'value' }, 'param')).not.toThrow();
    expect(() => Validate.object(new Date(), 'param')).not.toThrow();
  });

  it('should throw for non-objects', () => {
    expect(() => Validate.object(null, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.object([], 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.object('string', 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate boolean', () => {
  it('should validate booleans', () => {
    expect(() => Validate.boolean(true, 'param')).not.toThrow();
    expect(() => Validate.boolean(false, 'param')).not.toThrow();
  });

  it('should throw for non-booleans', () => {
    expect(() => Validate.boolean('true', 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.boolean(1, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.boolean(0, 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate array', () => {
  it('should validate arrays', () => {
    expect(() => Validate.array([], 'param')).not.toThrow();
    expect(() => Validate.array([1, 2, 3], 'param')).not.toThrow();
    expect(() => Validate.array(['a', 'b'], 'param')).not.toThrow();
  });

  it('should throw for non-arrays', () => {
    expect(() => Validate.array({}, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.array('string', 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.array(null, 'param')).toThrow(InvalidArgumentError);
  });

  it('should validate non-empty arrays', () => {
    expect(() => Validate.nonEmptyArray([1], 'param')).not.toThrow();
    expect(() => Validate.nonEmptyArray(['a', 'b'], 'param')).not.toThrow();
  });

  it('should throw for empty arrays', () => {
    expect(() => Validate.nonEmptyArray([], 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.nonEmptyArray({}, 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate number', () => {
  it('should validate numbers', () => {
    expect(() => Validate.number(0, 'param')).not.toThrow();
    expect(() => Validate.number(42, 'param')).not.toThrow();
    expect(() => Validate.number(-10, 'param')).not.toThrow();
    expect(() => Validate.number(3.14, 'param')).not.toThrow();
  });

  it('should throw for non-numbers', () => {
    expect(() => Validate.number('42', 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.number(NaN, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.number(null, 'param')).toThrow(InvalidArgumentError);
  });

  it('should validate integers', () => {
    expect(() => Validate.integer(0, 'param')).not.toThrow();
    expect(() => Validate.integer(42, 'param')).not.toThrow();
    expect(() => Validate.integer(-10, 'param')).not.toThrow();
  });

  it('should throw for non-integers', () => {
    expect(() => Validate.integer(3.14, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.integer('42', 'param')).toThrow(InvalidArgumentError);
  });

  it('should validate positive numbers', () => {
    expect(() => Validate.positiveNumber(1, 'param')).not.toThrow();
    expect(() => Validate.positiveNumber(42, 'param')).not.toThrow();
    expect(() => Validate.positiveNumber(0.1, 'param')).not.toThrow();
  });

  it('should throw for non-positive numbers', () => {
    expect(() => Validate.positiveNumber(0, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.positiveNumber(-1, 'param')).toThrow(InvalidArgumentError);
  });

  it('should validate non-negative numbers', () => {
    expect(() => Validate.nonNegativeNumber(0, 'param')).not.toThrow();
    expect(() => Validate.nonNegativeNumber(42, 'param')).not.toThrow();
    expect(() => Validate.nonNegativeNumber(0.1, 'param')).not.toThrow();
  });

  it('should throw for negative numbers', () => {
    expect(() => Validate.nonNegativeNumber(-1, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.nonNegativeNumber(-0.1, 'param')).toThrow(InvalidArgumentError);
  });

  it('should validate ranges', () => {
    expect(() => Validate.range(5, 1, 10, 'param')).not.toThrow();
    expect(() => Validate.range(1, 1, 10, 'param')).not.toThrow();
    expect(() => Validate.range(10, 1, 10, 'param')).not.toThrow();
  });

  it('should throw for out of range', () => {
    expect(() => Validate.range(0, 1, 10, 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.range(11, 1, 10, 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate function', () => {
  it('should validate functions', () => {
    expect(() => Validate.func(function () {}, 'param')).not.toThrow();
    expect(() => Validate.func(() => {}, 'param')).not.toThrow();
    expect(() => Validate.func(Validate.required, 'param')).not.toThrow();
  });

  it('should throw for non-functions', () => {
    expect(() => Validate.func('function', 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.func(null, 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate enum', () => {
  it('should validate enum values', () => {
    expect(() => Validate.enum('red', ['red', 'green', 'blue'], 'param')).not.toThrow();
    expect(() => Validate.enum(1, [1, 2, 3], 'param')).not.toThrow();
    expect(() => Validate.enum(true, [true, false], 'param')).not.toThrow();
  });

  it('should throw for invalid enum values', () => {
    expect(() => Validate.enum('yellow', ['red', 'green', 'blue'], 'param')).toThrow(
      InvalidArgumentError
    );
    expect(() => Validate.enum(4, [1, 2, 3], 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate object properties', () => {
  it('should validate required properties', () => {
    expect(() =>
      Validate.objectProperties({ name: 'test', age: 25, active: true }, ['name', 'age'], 'param')
    ).not.toThrow();
  });

  it('should throw for missing properties', () => {
    expect(() => Validate.objectProperties({ name: 'test' }, ['name', 'age'], 'param')).toThrow(
      InvalidArgumentError
    );
  });

  it('should throw for non-objects', () => {
    expect(() => Validate.objectProperties('not an object', ['name'], 'param')).toThrow(
      InvalidArgumentError
    );
  });
});

describe('Validate pattern', () => {
  it('should validate patterns', () => {
    expect(() => Validate.pattern('test@example.com', /\S+@\S+\.\S+/, 'email')).not.toThrow();
    expect(() => Validate.pattern('123-456-7890', /^\d{3}-\d{3}-\d{4}$/, 'phone')).not.toThrow();
  });

  it('should throw for pattern mismatch', () => {
    expect(() => Validate.pattern('invalid-email', /\S+@\S+\.\S+/, 'email')).toThrow(
      InvalidArgumentError
    );
    expect(() => Validate.pattern(123, /\d+/, 'param')).toThrow(InvalidArgumentError);
  });
});

describe('Validate optional', () => {
  it('should skip validation for null/undefined', () => {
    expect(() =>
      Validate.optional(
        null,
        () => {
          throw new Error('Should not run');
        },
        'param'
      )
    ).not.toThrow();
    expect(() =>
      Validate.optional(
        undefined,
        () => {
          throw new Error('Should not run');
        },
        'param'
      )
    ).not.toThrow();
  });

  it('should validate non-null/undefined values', () => {
    expect(() =>
      Validate.optional(
        'test',
        (value, name) => {
          Validate.nonEmptyString(value, name);
        },
        'param'
      )
    ).not.toThrow();
  });

  it('should throw if validation fails', () => {
    expect(() =>
      Validate.optional(
        '',
        (value, name) => {
          Validate.nonEmptyString(value, name);
        },
        'param'
      )
    ).toThrow(InvalidArgumentError);
  });
});

describe('Validate compound validators', () => {
  it('should pass when all validators pass', () => {
    expect(() =>
      Validate.all(
        [
          (value, name) => Validate.string(value, name),
          (value, name) => Validate.nonEmptyString(value, name)
        ],
        'test',
        'param'
      )
    ).not.toThrow();
  });

  it('should throw when any validator fails', () => {
    expect(() =>
      Validate.all(
        [
          (value, name) => Validate.string(value, name),
          (value, name) => Validate.number(value, name)
        ],
        'test',
        'param'
      )
    ).toThrow(InvalidArgumentError);
  });

  it('should pass when at least one validator passes', () => {
    expect(() =>
      Validate.any(
        [
          (value, name) => Validate.string(value, name),
          (value, name) => Validate.number(value, name)
        ],
        'test',
        'param'
      )
    ).not.toThrow();
  });

  it('should throw when all validators fail', () => {
    expect(() =>
      Validate.any(
        [
          (value, name) => Validate.number(value, name),
          (value, name) => Validate.boolean(value, name)
        ],
        'test',
        'param'
      )
    ).toThrow(InvalidArgumentError);
  });
});

describe('Validate error messages', () => {
  it('should include parameter name in error message', () => {
    try {
      Validate.nonEmptyString('', 'testParam');
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('testParam');
    }
  });

  it('should include expected values for enum', () => {
    try {
      Validate.enum('invalid', ['valid1', 'valid2'], 'testParam');
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('valid1');
      expect(error.message).toContain('valid2');
    }
  });
});

describe('Validate plain object', () => {
  it('should validate plain objects', () => {
    expect(() => Validate.validateObject({}, 'param')).not.toThrow();
    expect(() => Validate.validateObject({ key: 'value' }, 'param')).not.toThrow();
  });

  it('should throw for non-plain objects', () => {
    expect(() => Validate.validateObject([], 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.validateObject(new Date(), 'param')).toThrow(InvalidArgumentError);
    expect(() => Validate.validateObject(null, 'param')).toThrow(InvalidArgumentError);
  });

  it('should identify plain objects', () => {
    expect(Validate.isPlainObject({})).toBe(true);
    expect(Validate.isPlainObject({ a: 1 })).toBe(true);
    expect(Validate.isPlainObject([])).toBe(false);
    expect(Validate.isPlainObject(new Date())).toBe(false);
    expect(Validate.isPlainObject(null)).toBe(false);
    expect(Validate.isPlainObject(123)).toBe(false);
  });
});

describe('Validate update object', () => {
  it('should validate default cases', () => {
    expect(() => Validate.validateUpdateObject({ field: 1 }, 'param')).not.toThrow();
    expect(() => Validate.validateUpdateObject({ $set: { field: 1 } }, 'param')).not.toThrow();
  });

  it('should throw for empty update object', () => {
    expect(() => Validate.validateUpdateObject({}, 'param')).toThrow(InvalidArgumentError);
  });

  it('should throw when operators are forbidden', () => {
    expect(() =>
      Validate.validateUpdateObject({ $set: { field: 1 } }, 'param', { forbidOperators: true })
    ).toThrow(InvalidArgumentError);
  });

  it('should throw when operators are required', () => {
    expect(() =>
      Validate.validateUpdateObject({ field: 1 }, 'param', { requireOperators: true })
    ).toThrow(InvalidArgumentError);
  });

  it('should throw for mixed operators and fields', () => {
    expect(() => Validate.validateUpdateObject({ $set: { field: 1 }, field: 2 }, 'param')).toThrow(
      InvalidArgumentError
    );
  });

  it('should allow mixed when specified', () => {
    expect(() =>
      Validate.validateUpdateObject({ $set: { field: 1 }, field: 2 }, 'param', { allowMixed: true })
    ).not.toThrow();
  });

  it('should throw for non-object update', () => {
    expect(() => Validate.validateUpdateObject(null, 'param')).toThrow(InvalidArgumentError);
  });
});
