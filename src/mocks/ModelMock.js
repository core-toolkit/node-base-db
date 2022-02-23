const DataTypes = require('./DataTypesMock');
const { deepCopy, deepEquals } = require('node-base/src/utils/Obj');

module.exports = function (makeFn, seed = 0) {
  const {
    definition: schema,
    name: modelName,
  } = typeof makeFn === 'function' ? makeFn(DataTypes) : { definition: deepCopy(makeFn) };
  const fields = Object.keys(schema);
  for (const key of fields) {
    DataTypes.assertIsDataType(schema[key].type);
    schema[key].primaryKey = !!schema[key].primaryKey;
    schema[key].defaultValue ??= null;
    schema[key].autoIncrement = !!schema[key].autoIncrement && schema[key].primaryKey && schema[key].type === DataTypes.NUMBER;
    schema[key].unique = schema[key].primaryKey || !!schema[key].unique;
    schema[key].allowNull = schema[key].allowNull !== false && !schema[key].primaryKey;
  }

  const primary = fields.find((field) => schema[field].primaryKey);

  class Model {
    static #lastId = 0;
    static records = new Set();

    _previousDataValues = {};
    dataValues = {};
    isNewRecord = true;

    static __seed(n) {
      for (let i = 0; i < n; ++i) {
        const data = {};
        for (const field of fields) {
          data[field] = i + 1;

          if (schema[field].type === DataTypes.TEXT && !schema[field].primaryKey) {
            data[field] = `${field} ${data[field]}`;
          }
        }
        this.__create(data);
      }
    }

    static __build(data) {
      return new this(data);
    }

    static __create(data) {
      const instance = new this(data);
      instance.__save();
      return instance;
    };

    static * #query({ where } = { }) {
      if (!where) {
        where = {};
      }
      for (const row of this.records.values()) {
        if (Object.keys(where).every((key) => (where[key] ? schema[key].type.convert(where[key]) : null) === row[key])) {
          yield new this(row, { isNewRecord: false });
        }
      }
    }

    static __findByPk(id) {
      return this.__findOne({ where: { [primary]: id }});
    };

    static __findOne(...args) {
      return this.#query(...args).next().value ?? null;
    };

    static __findAll(...args) {
      const results = [];
      for (const instance of this.#query(...args)) {
        results.push(instance);
      }
      return results;
    };

    static __count(...args) {
      return this.__findAll(...args).length;
    }

    static __destroy(...args) {
      this.__findAll(...args).forEach((instance) => instance.__destroy());
    }

    static __update(values, ...args) {
      this.__findAll(...args).forEach((instance) => instance.__update(values));
    }

    static mockClear() {
      this.build.mockClear();
      this.create.mockClear();
      this.findByPk.mockClear();
      this.findOne.mockClear();
      this.findAll.mockClear();
      this.count.mockClear();
      this.destroy.mockClear();
      this.update.mockClear();
    }

    static mockReset() {
      this.mockClear();
      this.#lastId = 0;
      this.records.clear();
      this.__seed(seed);
    }

    constructor(data = {}, options = {}) {
      this.isNewRecord = options.isNewRecord ?? true;

      if (!this.isNewRecord) {
        this._previousDataValues = data;
      }

      for (const field of fields) {
        this.dataValues[field] = deepCopy(data[field]) ?? null;
      }

      return new Proxy(this, {
        get: (obj, key) => {
          if (fields.includes(key)) {
            return obj.get(key);
          }
          return obj[key];
        },
        set(obj, key, value) {
          if (fields.includes(key)) {
            obj.set(key, value);
          }
          obj[key] = value;
          return true;
        }
      });
    }

    __set(obj, value) {
      if (typeof obj === 'string') {
        obj = { [obj]: value };
      }
      for (const key of Object.keys(obj)) {
        if (fields.includes(key)) {
          this.dataValues[key] = obj[key];
        }
      }
    }

    __get(key) {
      return fields.includes(key) ? this.dataValues[key] : this.dataValues;
    }

    __changed(key) {
      if (fields.includes(key)) {
        return !deepEquals(this.dataValues[key], this._previousDataValues[key]);
      }
      return fields.filter((field) => this.__changed(field));
    }

    __equals(other) {
      return other._previousDataValues === this._previousDataValues;
    }

    __destroy() {
      Model.records.delete(this._previousDataValues);
    }

    __update(values) {
      this.__set(values);
      this.__save();
    }

    __reload() {
      this.dataValues = deepCopy(this._previousDataValues);
    }

    __toJSON() {
      return deepCopy(this.dataValues);
    }

    __save() {
      for (const field of fields) {
        const def = schema[field];
        this.dataValues[field] ??= typeof def.defaultValue === 'function' ? def.defaultValue() : def.defaultValue;
        if (!def.allowNull && this.dataValues[field] === null && !(def.autoIncrement && this.isNewRecord)) {
          throw new Error(`Field "${field}" cannot be null`);
        }
        if (this.dataValues[field] !== null) {
          this.dataValues[field] = def.type.convert(this.dataValues[field]);
        }
        if (def.unique && (this.__changed(field) || this.isNewRecord) && Model.__findOne({ where: { [field]: this.dataValues[field] } })) {
          throw new Error(`The value of field "${field}" must be unique`);
        }
      }
      if (this.isNewRecord) {
        if (schema[primary]?.autoIncrement) {
          this.dataValues[primary] = ++Model.#lastId;
        }
        this.isNewRecord = false;
        Model.records.add(this._previousDataValues);
      }
      Object.assign(this._previousDataValues, deepCopy(this.dataValues));
    }

    /**
     * @type {(data: Object.<string, any>) => Model}
     */
    static build = jest.fn((...args) => this.__build(...args));

    /**
     * @type {(data: Object.<string, any>) => Promise<Model>}
     */
    static create = jest.fn(async (...args) => this.__create(...args));

    /**
     * @type {(id: any) => Promise<Model>}
     */
    static findByPk = jest.fn(async (...args) => this.__findByPk(...args));

    /**
     * @type {(options: { where: Object.<string, any>}) => Promise<Model>}
     */
    static findOne = jest.fn(async (...args) => this.__findOne(...args));

    /**
     * @type {(options: { where: Object.<string, any>}) => Promise<Model[]>}
     */
    static findAll = jest.fn(async (...args) => this.__findAll(...args));

    /**
     * @type {(options: { where: Object.<string, any>}) => Promise<Number>}
     */
    static count = jest.fn(async (...args) => this.__count(...args));

    /**
     * @type {(options: { where: Object.<string, any>}) => Promise<void>}
     */
    static destroy = jest.fn(async (...args) => this.__destroy(...args));

    /**
     * @type {(values: Object.<string, any>, options: { where: Object.<string, any>}) => Promise<void>}
     */
    static update = jest.fn(async (...args) => this.__update(...args));

    /**
     * @type {(key: String, value: any) => void}
     */
    set = jest.fn((...args) => this.__set(...args));

    /**
     * @type {(key: String) => any}
     */
    get = jest.fn((...args) => this.__get(...args));

    /**
     * @type {(key: String) => (Boolean|String[])}
     */
    changed = jest.fn((...args) => this.__changed(...args));

    /**
     * @type {(other: Model) => (Boolean)}
     */
    equals = jest.fn((...args) => this.__equals(...args));

    /**
     * @type {() => Promise<void>}
     */
    save = jest.fn(async (...args) => this.__save(...args));

    /**
     * @type {() => Promise<void>}
     */
    destroy = jest.fn(async (...args) => this.__destroy(...args));

    /**
     * @type {(values: Object.<string, any>) => Promise<void>}
     */
    update = jest.fn(async (...args) => this.__update(...args));

    /**
     * @type {(values: Object.<string, any>) => Promise<void>}
     */
    reload = jest.fn(async (...args) => this.__reload(...args));

    /**
     * @type {() => Object.<string, any>}
     */
     toJSON = jest.fn((...args) => this.__toJSON(...args));
  }

  Model.__seed(seed);

  if (modelName) {
    Object.defineProperty(Model, 'name', { value: modelName });
  }
  return Model;
};

module.exports.DataTypes = DataTypes;
