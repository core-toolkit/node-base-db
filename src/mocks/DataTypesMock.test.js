const DataTypes = require('./DataTypesMock');

const types = ['ARRAY', 'BOOLEAN', 'CHAR', 'DATE', 'ENUM', 'GEOGRAPHY', 'GEOMETRY', 'HSTORE', 'NUMBER', 'RANGE', 'VIRTUAL', 'TINYINT', 'INTEGER', 'BIGINT', 'MEDIUMINT', 'SMALLINT', 'DECIMAL', 'DOUBLE', 'FLOAT', 'REAL', 'NUMERIC', 'JSONB', 'JSON', 'UUID', 'UUIDV1', 'UUIDV4', 'MACADDR', 'CIDR', 'TSVECTOR', 'INET', 'CITEXT', 'TEXT', 'STRING', 'BLOB', 'TIME', 'DATEONLY'];

describe('DataTypesMock', () => {
  describe('.assertIsDataType()', () => {
    it('passes on valid types', () => {
      DataTypes.assertIsDataType(DataTypes.NUMBER);
    });

    it('throws on invalid types', () => {
      expect(() => DataTypes.assertIsDataType('foo')).toThrow();
      expect(() => DataTypes.assertIsDataType({ typeName: 'foo' })).toThrow();
    });
  });

  it('.NOW() makes a date object', () => {
    const date = DataTypes.NOW();
    expect(date).toBeInstanceOf(Date);
  });

  describe('types', () => {
    it.each(types)('.%s is a valid data type', (type) => {
      expect(DataTypes).toHaveProperty(type);

      const baseType = DataTypes[type];
      const subType = baseType();
      expect(subType).not.toBe(baseType);

      expect(baseType).toHaveProperty('typeName', expect.any(String));
      expect(baseType).toHaveProperty('convert', expect.any(Function));
      expect(baseType).toHaveProperty('options', expect.any(Array));
      DataTypes.assertIsDataType(baseType);

      expect(subType).toHaveProperty('typeName', expect.any(String));
      expect(subType).toHaveProperty('convert', expect.any(Function));
      expect(subType).toHaveProperty('options', expect.any(Array));
      DataTypes.assertIsDataType(subType);
    });

    it('.NUMBER parses valid numbers', () => {
      expect(DataTypes.NUMBER.convert(5)).toBe(5);
      expect(DataTypes.NUMBER.convert('-5.2')).toBe(-5.2);
    });

    it('.NUMBER throws on invalid numbers', () => {
      expect(() => DataTypes.NUMBER.convert('foo')).toThrow();
      expect(() => DataTypes.NUMBER.convert(-Infinity)).toThrow();
    });

    it('.TEXT parses values', () => {
      expect(DataTypes.TEXT.convert('5')).toBe('5');
      expect(DataTypes.TEXT.convert(5)).toBe('5');
      expect(DataTypes.TEXT.convert({ toString: () => 'foo' })).toBe('foo');
    });

    it('.DATE parses dates', () => {
      expect(DataTypes.DATE.convert(new Date())).toBeInstanceOf(Date);
      expect(DataTypes.DATE.convert('1970-01-01T00:00:00')).toBeInstanceOf(Date);
      expect(DataTypes.DATE.convert(0)).toBeInstanceOf(Date);
    });

    it('.BOOLEAN parses values', () => {
      expect(DataTypes.BOOLEAN.convert(true)).toBe(true);
      expect(DataTypes.BOOLEAN.convert(false)).toBe(false);
      expect(DataTypes.BOOLEAN.convert('foo')).toBe(true);
      expect(DataTypes.BOOLEAN.convert('')).toBe(false);
    });

    it('.ENUM parses valid values', () => {
      const type = DataTypes.ENUM(['foo', 'bar'], 'baz', { values: ['qux'] });
      expect(type.convert('bar')).toEqual('bar');
      expect(type.convert('baz')).toEqual('baz');
      expect(type.convert('qux')).toEqual('qux');
    });

    it('.ENUM throws on invalid values', () => {
      expect(() => DataTypes.ENUM(['foo']).convert('bar')).toThrow();
    });

    it('.ARRAY parses the underlying type', () => {
      expect(DataTypes.ARRAY(DataTypes.NUMBER).convert([3, '0x4', '5'])).toEqual([3, 4, 5]);
    });

    it('.ARRAY throws on non-array values', () => {
      expect(() => DataTypes.ARRAY(DataTypes.NUMBER).convert('foo')).toThrow();
    });

    it('.RANGE parses the underlying type', () => {
      expect(DataTypes.RANGE(DataTypes.NUMBER).convert('5')).toBe(5);
    });

    it('.HSTORE parses valid objects', () => {
      expect(DataTypes.HSTORE.convert({ foo: 'bar' })).toEqual({ foo: 'bar' });
    });

    it('.HSTORE throws on non-objects values', () => {
      expect(() => DataTypes.HSTORE.convert('foo')).toThrow();
    });

    it.each(['GEOGRAPHY', 'GEOMETRY', 'VIRTUAL'])('.%s pass the value', (type) => {
      expect(DataTypes[type].convert('foo')).toBe('foo');
    });
  });
});
