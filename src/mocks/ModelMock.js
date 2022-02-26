const { Op } = require('sequelize');
const { camelize, pluralize, singularize } = require('sequelize/dist/lib/utils');
const DataTypes = require('./DataTypesMock');
const { deepCopy, deepEquals } = require('node-base/src/utils/Obj');

const toInstanceArray = (instances) => (instances ? [].concat(instances) : []);

const makeFk = (spec, target, fk, as, allowNull = true) => {
  if (!spec?.name) {
    spec = { name: spec };
  }
  spec.name ??= camelize(`${singularize(as)}_${fk}`);
  spec.type ??= target.__schema[fk].type;
  spec.allowNull ??= allowNull;
  return spec;
};

const AssocMethods = {
  get: ({ options, target, type }, instance) => () => {
    const where = {};
    if (type === 'belongsToMany') {
      const throughs = options.through.model.__findAll({
        where: {
          [options.foreignKey.name]: instance.get(options.sourceKey),
        },
      });
      where[options.targetKey] = throughs.map((through) => through.get(options.otherKey.name));
    } else if (type === 'belongsTo') {
      where[options.targetKey] = instance.get(options.foreignKey.name);
    } else {
      where[options.foreignKey.name] = instance.get(options.sourceKey);
    }
    return target[`__find${type.endsWith('Many') ? 'All' : 'One'}`]({ where });
  },
  set: ({ options, target, type }, instance) => (others) => {
    const [other] = others = toInstanceArray(others);
    if (type === 'belongsTo') {
      const otherKey = other?.[options.targetKey] ?? null;

      if (otherKey) {
        instance.__Model.__update({ [options.foreignKey.name]: null }, {
          where: {
            [options.foreignKey.name]: otherKey,
          },
        });
      }
      instance.__update({ [options.foreignKey.name]: otherKey });
    } else if (type === 'belongsToMany') {
      options.through.model.__destroy({
        where: {
          [options.foreignKey.name]: instance.get(options.sourceKey),
        },
      });
      for (const other of others) {
        options.through.model.__create({
          [options.foreignKey.name]: instance.get(options.sourceKey),
          [options.otherKey.name]: other.get(options.targetKey),
        });
      }
    } else {
      target.__update({ [options.foreignKey.name]: null }, {
        where: {
          [options.foreignKey.name]: instance.get(options.sourceKey),
        },
      });
      for (const other of others) {
        other.__update({ [options.foreignKey.name]: instance.get(options.sourceKey) });
      }
    }
  },
  count: (association, instance) => () => AssocMethods.get(association, instance)().length,
  has: ({ options, type }, instance) => (others) => {
    for (const other of toInstanceArray(others)) {
      if (type === 'belongsToMany') {
        const through = options.through.model.__findOne({
          where: {
            [options.foreignKey.name]: instance.get(options.sourceKey),
            [options.otherKey.name]: other.get(options.targetKey),
          },
        });
        if (!through) {
          return false;
        }
      } else {
        if (other.get(options.foreignKey.name) !== instance.get(options.sourceKey)) {
          return false;
        }
      }
    }
    return true;
  },
  add: ({ options, type }, instance) => (others) => {
    for (const other of toInstanceArray(others)) {
      if (type === 'belongsToMany') {
        options.through.model.__create({
          [options.foreignKey.name]: instance.get(options.sourceKey),
          [options.otherKey.name]: other.get(options.targetKey),
        });
      } else {
        other.__update({ [options.foreignKey.name]: instance.get(options.sourceKey) });
      }
    }
  },
  remove: ({ options, type }, instance) => (others) => {
    for (const other of toInstanceArray(others)) {
      if (type === 'belongsToMany') {
        options.through.model.__destroy({
          where: {
            [options.foreignKey.name]: instance.get(options.sourceKey),
            [options.otherKey.name]: other.get(options.targetKey),
          },
        });
      } else {
        other.__update({ [options.foreignKey.name]: null });
      }
    }
  },
  create: ({ options, target, type }, instance) => (values = {}) => {
    values = { ...values };

    if (type !== 'belongsToMany') {
      values[options.foreignKey.name] = instance.get(options.sourceKey);
    }

    if (type === 'hasOne') {
      target.__update({ [options.foreignKey.name]: null }, {
        where: {
          [options.foreignKey.name]: instance.get(options.sourceKey),
        },
      });
    }

    const other = target.__create(values);

    if (type === 'belongsTo') {
      instance.__update({ [options.foreignKey.name]: other[options.targetKey] });
    } else if (type === 'belongsToMany') {
      options.through.model.__create({
        [options.foreignKey.name]: instance.get(options.sourceKey),
        [options.otherKey.name]: other.get(options.targetKey),
      });
    }

    return other;
  },
};

module.exports = function MakeModel(makeFn, seed = 0, models = {}) {
  const {
    associations = {},
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

  const match = (row, key, op, value) => {
    value ??= null;

    const nullOrConvert = (value) => (value === null ? null : schema[key].type.convert(value));

    switch (op) {
      case Op.and:
        return value.every((v) => match(row, key, key, v));
      case Op.or:
        return value.some((v) => match(row, key, key, v));
      case Op.not:
        return !match(row, key, null, value);
      case Op.eq:
      case Op.is:
        return row[key] === nullOrConvert(value);
      case Op.ne:
        return row[key] !== nullOrConvert(value);
      case Op.gt:
        return row[key] > nullOrConvert(value);
      case Op.gte:
        return row[key] >= nullOrConvert(value);
      case Op.lt:
        return row[key] < nullOrConvert(value);
      case Op.lte:
        return row[key] <= nullOrConvert(value);
      case Op.between:
        return nullOrConvert(value[0]) <= row[key] && row[key] <= nullOrConvert(value[1]);
      case Op.in:
        return value.map(nullOrConvert).includes(row[key]);
      case Op.notBetween:
        return !match(row, key, Op.between, value);
      case Op.notIn:
        return !match(row, key, Op.in, value);
      case Op.regexp:
        return RegExp(value).test(row[key]);
      case Op.notRegexp:
        return !match(row, key, Op.regexp, value);
      case Op.iRegexp:
        return match(row, key, Op.regexp, RegExp(value, 'i'));
      case Op.notIRegexp:
        return !match(row, key, Op.iRegexp, value);
      case Op.like:
        value = value.replace(/%/g, '.*').replace(/_/g, '.');
        return match(row, key, Op.regexp, `^${value}$`);
      case Op.notLike:
        return !match(row, key, Op.like, value);
      case Op.startsWith:
        return match(row, key, Op.like, `${value}%`);
      case Op.endsWith:
        return match(row, key, Op.like, `%${value}`);
      case Op.substring:
        return match(row, key, Op.like, `%${value}%`);
      case Op.iLike:
        value = value.replace(/%/g, '.*').replace(/_/g, '.');
        return match(row, key, Op.iRegexp, `^${value}$`);
      case Op.notILike:
        return !match(row, key, Op.iLike, value);
      case Op.col:
        return row[key] === row[value];
      case Op.all:
      case Op.any:
      case Op.match:
      case Op.contains:
      case Op.contained:
      case Op.overlap:
      case Op.adjacent:
      case Op.strictLeft:
      case Op.strictRight:
      case Op.noExtendLeft:
      case Op.noExtendRight:
        throw new Error(`Operator "Op.${op.description}" is not yet supported in mocks`);
    }

    if (typeof value !== 'object' || value === null) {
      return match(row, key, Op.eq, value);
    }

    if (Array.isArray(value)) {
      return match(row, key, Op.in, value);
    }

    return Object.keys(value).map((key) => [row, key, null, value[key]]).concat(
      Object.getOwnPropertySymbols(value).map((op) => [row, key, op, value[op]])
    ).every((args) => match(...args));
  };

  class Model {
    static #lastId = 0;
    static __records = new Set();
    static __schema = schema;
    static __fields = fields;
    static __primary = primary;
    static __associations = [];
    static __pendingAssociations = associations;

    __Model = Model;
    _previousDataValues = {};
    dataValues = {};
    isNewRecord = true;

    static __seed(n) {
      for (let i = 0; i < n; ++i) {
        const data = {};
        for (const field of fields) {
          data[field] = i + 1;

          if (schema[field].primaryKey) {
            continue;
          }

          switch (schema[field].type.typeName) {
            case DataTypes.TEXT.typeName:
              data[field] = `${field} ${data[field]}`;
              break;
            case DataTypes.ENUM.typeName:
              const values = schema[field].type.options.flat().flatMap((v) => v.values ?? v);
              data[field] = values[(data[field] - 1) % values.length];
              break;
            case DataTypes.ARRAY.typeName:
              data[field] = [data[field], data[field] + 1, data[field] + 2];
              break;
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

    static * __query(options = {}) {
      const {
        where = {},
      } = options;

      let {
        limit = 0,
        offset = 0,
        order = [],
      } = options;

      const records = [...this.__records.values()];
      if (order.length) {
        if (typeof order[0] === 'string') {
          order = [order];
        }
        records.sort((a, b) => {
          for (const [key, direction] of order) {
            if (a[key] === b[key]) continue;
            return a[key] > b[key] && direction === 'DESC' || a[key] < b[key] && direction !== 'DESC' ? -1 : 1;
          }
          return 0;
        });
      }

      for (const row of records) {
        if (match(row, null, null, where)) {
          if (offset-- > 0) continue;

          yield new this(row, { isNewRecord: false });

          if (--limit === 0) break;
        }
      }
    }

    static __belongsTo(target, options = {}) {
      options.as ??= singularize(target.name);

      options.targetKey ??= target.__primary;

      options.foreignKey = makeFk(options.foreignKey, target, options.targetKey, options.as);

      this.__associations.push({
        options,
        target,
        type: 'belongsTo',
        methods: {
          [camelize(`get_${singularize(options.as)}`)]: AssocMethods.get,
          [camelize(`set_${singularize(options.as)}`)]: AssocMethods.set,
          [camelize(`create_${singularize(options.as)}`)]: AssocMethods.create,
        },
      });
    }

    static __hasOne(target, options = {}) {
      options.as ??= singularize(target.name);

      options.sourceKey ??= primary;

      options.foreignKey = makeFk(options.foreignKey, this, options.sourceKey, this.name);

      this.__associations.push({
        options,
        target,
        type: 'hasOne',
        methods: {
          [camelize(`get_${singularize(options.as)}`)]: AssocMethods.get,
          [camelize(`set_${singularize(options.as)}`)]: AssocMethods.set,
          [camelize(`create_${singularize(options.as)}`)]: AssocMethods.create,
        },
      });
    }

    static __hasMany(target, options = {}) {
      options.as ??= pluralize(target.name);

      options.sourceKey ??= primary;

      options.foreignKey = makeFk(options.foreignKey, this, options.sourceKey, this.name);

      const asPlural = pluralize(options.as);
      const asSingular = singularize(options.as);

      this.__associations.push({
        options,
        target,
        type: 'hasMany',
        methods: {
          [camelize(`get_${asPlural}`)]: AssocMethods.get,
          [camelize(`count_${asPlural}`)]: AssocMethods.count,
          [camelize(`has_${asSingular}`)]: AssocMethods.has,
          [camelize(`has_${asPlural}`)]: AssocMethods.has,
          [camelize(`set_${asPlural}`)]: AssocMethods.set,
          [camelize(`add_${asSingular}`)]: AssocMethods.add,
          [camelize(`add_${asPlural}`)]: AssocMethods.add,
          [camelize(`remove_${asSingular}`)]: AssocMethods.remove,
          [camelize(`remove_${asPlural}`)]: AssocMethods.remove,
          [camelize(`create_${asSingular}`)]: AssocMethods.create,
        },
      });
    }

    static __belongsToMany(target, options) {
      options.as ??= pluralize(target.name);

      options.targetKey ??= target.__primary;

      options.otherKey = makeFk(options.otherKey, target, options.targetKey, target === this ? options.as : target.name, false);

      options.sourceKey ??= primary;

      options.foreignKey = makeFk(options.foreignKey, this, options.sourceKey, this.name, false);

      if (!options.through.model) {
        options.through = { model: options.through };
      }
      if (typeof options.through.model === 'string') {
        options.through.model = models[options.through.model] ?? MakeModel(() => ({
          name: options.through.model,
          definition: {
            [options.foreignKey.name]: {
              allowNull: options.foreignKey.allowNull,
              type: options.foreignKey.type,
            },
            [options.otherKey.name]: {
              allowNull: options.otherKey.allowNull,
              type: options.otherKey.type,
            },
          },
        }), 0, models);
      }
      const asPlural = pluralize(options.as);
      const asSingular = singularize(options.as);

      this.__associations.push({
        options,
        target,
        type: 'belongsToMany',
        methods: {
          [camelize(`get_${asPlural}`)]: AssocMethods.get,
          [camelize(`count_${asPlural}`)]: AssocMethods.count,
          [camelize(`has_${asSingular}`)]: AssocMethods.has,
          [camelize(`has_${asPlural}`)]: AssocMethods.has,
          [camelize(`set_${asPlural}`)]: AssocMethods.set,
          [camelize(`add_${asSingular}`)]: AssocMethods.add,
          [camelize(`add_${asPlural}`)]: AssocMethods.add,
          [camelize(`remove_${asSingular}`)]: AssocMethods.remove,
          [camelize(`remove_${asPlural}`)]: AssocMethods.remove,
          [camelize(`create_${asSingular}`)]: AssocMethods.create,
        },
      });
    }

    static __findByPk(id) {
      return this.__findOne({ where: { [primary]: id }});
    }

    static __findOne(...args) {
      return this.__query(...args).next().value ?? null;
    }

    static __findAll(...args) {
      const results = [];
      for (const instance of this.__query(...args)) {
        results.push(instance);
      }
      return results;
    }

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
      this.belongsTo.mockClear();
      this.belongsToMany.mockClear();
      this.hasOne.mockClear();
      this.hasMany.mockClear();
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
      this.__records.clear();
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

      for (const association of Model.__associations) {
        for (const method of Object.keys(association.methods)) {
          this[`__${method}`] = association.methods[method](association, this);
          this[method] = jest.fn(async (...args) => this[`__${method}`](...args));
        }
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
      Model.__records.delete(this._previousDataValues);
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
        Model.__records.add(this._previousDataValues);
      }
      Object.assign(this._previousDataValues, deepCopy(this.dataValues));
    }

    /**
     * @type {(target: Model, options: Object.<string, any>) => void}
     */
    static belongsTo = jest.fn((...args) => this.__belongsTo(...args));

    /**
     * @type {(target: Model, options: Object.<string, any>) => void}
     */
    static belongsToMany = jest.fn((...args) => this.__belongsToMany(...args));

    /**
     * @type {(target: Model, options: Object.<string, any>) => void}
     */
    static hasOne = jest.fn((...args) => this.__hasOne(...args));

    /**
     * @type {(target: Model, options: Object.<string, any>) => void}
     */
    static hasMany = jest.fn((...args) => this.__hasMany(...args));

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
    models[modelName] = Model;
  }

  for (const self of Object.keys(models)) {
    for (const target of Object.keys(models[self].__pendingAssociations)) {
      if (target in models) {
        models[self].__pendingAssociations[target](models[self], models[target]);
        delete models[self].__pendingAssociations[target];
      }
    }
  }

  return Model;
};

module.exports.DataTypes = DataTypes;
