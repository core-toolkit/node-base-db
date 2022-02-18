/**
 * @typedef {(...opts) => DataType} DataTypeFunc
 *
 * @typedef {Object} DataTypeProps
 * @property {String} typeName
 * @property {Function} convert
 * @property {Array} options
 *
 * @typedef {DataTypeProps & DataTypeFunc} DataType
 *
 * @typedef DataTypes
 * @property {() => void} assertIsDataType
 * @property {() => Date} NOW
 * @property {DataType} ARRAY
 * @property {DataType} BOOLEAN
 * @property {DataType} CHAR
 * @property {DataType} DATE
 * @property {DataType} ENUM
 * @property {DataType} GEOGRAPHY
 * @property {DataType} GEOMETRY
 * @property {DataType} HSTORE
 * @property {DataType} NUMBER
 * @property {DataType} RANGE
 * @property {DataType} VIRTUAL
 * @property {DataType} TINYINT
 * @property {DataType} INTEGER
 * @property {DataType} BIGINT
 * @property {DataType} MEDIUMINT
 * @property {DataType} SMALLINT
 * @property {DataType} DECIMAL
 * @property {DataType} DOUBLE
 * @property {DataType} FLOAT
 * @property {DataType} REAL
 * @property {DataType} NUMERIC
 * @property {DataType} JSONB
 * @property {DataType} JSON
 * @property {DataType} UUID
 * @property {DataType} UUIDV1
 * @property {DataType} UUIDV4
 * @property {DataType} MACADDR
 * @property {DataType} CIDR
 * @property {DataType} TSVECTOR
 * @property {DataType} INET
 * @property {DataType} CITEXT
 * @property {DataType} TEXT
 * @property {DataType} STRING
 * @property {DataType} BLOB
 * @property {DataType} TIME
 * @property {DataType} DATEONLY
 *
 * @param {String} typeName
 * @param {Function} convert
 * @param {*} options
 * @returns {DataType}
 */
const makeDataType = (typeName, convert = (v) => v, options = []) => {
  return Object.assign(function type(...options) {
    type.options = options;
    return makeDataType(typeName, convert, options);
  }, { typeName, convert, options });
};

/**
 * @type {DataTypes}
 */
const DataTypes = {
  ARRAY: makeDataType('ARRAY', function (a) {
    DataTypes.assertIsDataType(this.options[0]);
    if (!Array.isArray(a)) {
      throw new Error('Value is not an array');
    }
    return a.map((v) => this.options[0].convert(v));
  }),
  BOOLEAN: makeDataType('BOOLEAN', (v) => !!v),
  TEXT: makeDataType('TEXT', (v) => String(v)),
  DATE: makeDataType('DATE', (v) => (v instanceof Date ? v : new Date(v))),
  ENUM: makeDataType('ENUM', function (v) {
    const allowedValues = this.options.flat().flatMap((v) => v.values ?? v);
    if (!allowedValues.includes(v)) {
      throw new Error(`"${v}" is not a valid value, must be one of: [${allowedValues.join( )}]`);
    }
    return v;
  }),
  GEOGRAPHY: makeDataType('GEOGRAPHY'),
  GEOMETRY: makeDataType('GEOMETRY'),
  HSTORE: makeDataType('HSTORE', (v) => {
    const type = typeof v;
    if (type !== 'object') {
      throw new Error(`Invalid type "${type}", expected object`);
    }
    return v;
  }),
  NUMBER: makeDataType('NUMBER', (v) => {
    const n = Number(v);
    if (Number.isNaN(n) || !Number.isFinite(n)) {
      throw new Error(`"${v}" is not a valid number`);
    }
    return n;
  }),
  RANGE: makeDataType('RANGE', function (v) {
    DataTypes.assertIsDataType(this.options[0]);
    return this.options[0].convert(v);
  }),
  VIRTUAL: makeDataType('VIRTUAL'),
  NOW: () => new Date(),
  assertIsDataType(type) {
    if (!(type?.typeName in DataTypes)) {
      throw new Error('The supplied is not a valid DataType');
    }
  }
};

const numberTypes = ['TINYINT', 'INTEGER', 'BIGINT', 'MEDIUMINT', 'SMALLINT', 'DECIMAL', 'DOUBLE', 'FLOAT', 'REAL', 'NUMERIC'];
for (const type of numberTypes) {
  DataTypes[type] = DataTypes.NUMBER;
}

const textTypes = ['JSONB', 'JSON', 'UUID', 'UUIDV1', 'UUIDV4', 'MACADDR', 'CIDR', 'TSVECTOR', 'INET', 'CITEXT', 'CHAR', 'STRING', 'BLOB'];
for (const type of textTypes) {
  DataTypes[type] = DataTypes.TEXT;
}

DataTypes.TIME = DataTypes.DATEONLY = DataTypes.DATE;

module.exports = DataTypes;
