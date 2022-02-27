const { Op } = require('sequelize');
const ModelMock = require('./ModelMock');
const { STRING, NUMBER } = require('./DataTypesMock');

const makeModelWithDirtyMocks = async (seed = 0) => {
  const Model = ModelMock({ id: { primaryKey: true, autoIncrement: true, type: NUMBER } }, seed);
  Model.build();
  Model.belongsTo(Model);
  Model.belongsToMany(Model, { through: 'ModelModel' });
  Model.hasOne(Model);
  Model.hasMany(Model);
  await Model.destroy({ where: { id: -1 } });
  await Model.update({});
  await Model.create();
  await Model.findByPk();
  await Model.findAll();
  await Model.findOne();
  await Model.count();

  return Model;
};

const assertClearedMocks = (Model) => {
  expect(Model.belongsTo).not.toHaveBeenCalled();
  expect(Model.belongsToMany).not.toHaveBeenCalled();
  expect(Model.hasOne).not.toHaveBeenCalled();
  expect(Model.hasMany).not.toHaveBeenCalled();
  expect(Model.destroy).not.toHaveBeenCalled();
  expect(Model.update).not.toHaveBeenCalled();
  expect(Model.build).not.toHaveBeenCalled();
  expect(Model.create).not.toHaveBeenCalled();
  expect(Model.findByPk).not.toHaveBeenCalled();
  expect(Model.findAll).not.toHaveBeenCalled();
  expect(Model.findOne).not.toHaveBeenCalled();
  expect(Model.count).not.toHaveBeenCalled();
};

const assertModelClass = (Model) => {
  expect(Model).toBeInstanceOf(Function);
  expect(Model).toHaveProperty('__records', expect.any(Set));
  expect(Model).toHaveProperty('mockClear', expect.any(Function));
  expect(Model).toHaveProperty('mockReset', expect.any(Function));
  expect(Model).toHaveProperty('belongsTo', expect.any(Function));
  expect(Model).toHaveProperty('belongsToMany', expect.any(Function));
  expect(Model).toHaveProperty('hasOne', expect.any(Function));
  expect(Model).toHaveProperty('hasMany', expect.any(Function));
  expect(Model).toHaveProperty('build', expect.any(Function));
  expect(Model).toHaveProperty('create', expect.any(Function));
  expect(Model).toHaveProperty('findOne', expect.any(Function));
  expect(Model).toHaveProperty('findByPk', expect.any(Function));
  expect(Model).toHaveProperty('findAll', expect.any(Function));
  expect(Model).toHaveProperty('count', expect.any(Function));
  expect(Model).toHaveProperty('destroy', expect.any(Function));
  expect(Model).toHaveProperty('update', expect.any(Function));
};

describe('ModelMock', () => {
  it('.DataTypes contains all available data types', () => {
    expect(ModelMock).toHaveProperty('DataTypes', expect.any(Object));
  });

  it('makes a model mock with a plain object', () => {
    const Model = ModelMock({ foo: { type: STRING } });
    assertModelClass(Model);
  });

  it('makes a model mock with a make function', () => {
    const Model = ModelMock((DataTypes) => ({
      name: 'Test',
      definition: {
        foo: { type: DataTypes.STRING },
      },
    }));
    assertModelClass(Model);
  });

  it('makes a model mock with a make function and model storage', () => {
    const models = {};
    const Model = ModelMock((DataTypes) => ({
      name: 'Test',
      definition: {
        foo: { type: DataTypes.STRING },
      },
    }), 0, models);
    expect(models).toHaveProperty('Test', Model);
  });

  it('makes a model mock and seeds data', () => {
    const Model = ModelMock({
      id: { primaryKey: true, type: STRING },
      foo: { type: STRING },
      bar: { type: NUMBER },
    }, 5);

    const records = Model.__findAll();
    expect(records.map((row) => row.get())).toEqual([
      { id: '1', foo: 'foo 1', bar: 1 },
      { id: '2', foo: 'foo 2', bar: 2 },
      { id: '3', foo: 'foo 3', bar: 3 },
      { id: '4', foo: 'foo 4', bar: 4 },
      { id: '5', foo: 'foo 5', bar: 5 },
    ]);
  });

  it('makes a model mock and seeds complex data', () => {
    const Model = ModelMock((DataTypes) => ({
      name: 'Test',
      definition: {
        id: { primaryKey: true, type: DataTypes.NUMBER },
        foo: { type: DataTypes.RANGE(DataTypes.NUMBER) },
        bar: { type: DataTypes.ENUM('a', 'b', 'c') },
        baz: { type: DataTypes.ARRAY(DataTypes.NUMBER) },
        qux: { type: DataTypes.DATE },
      },
    }), 5);

    const records = Model.__findAll();
    expect(records.map((row) => row.get())).toEqual([
      { id: 1, foo: 1, bar: 'a', baz: [1, 2, 3], qux: new Date(1) },
      { id: 2, foo: 2, bar: 'b', baz: [2, 3, 4], qux: new Date(2) },
      { id: 3, foo: 3, bar: 'c', baz: [3, 4, 5], qux: new Date(3) },
      { id: 4, foo: 4, bar: 'a', baz: [4, 5, 6], qux: new Date(4) },
      { id: 5, foo: 5, bar: 'b', baz: [5, 6, 7], qux: new Date(5) },
    ]);
  });

  it('makes a model instance', () => {
    const Model = ModelMock({ foo: { type: STRING } });

    const instance = new Model();
    expect(instance).toBeInstanceOf(Model);
    expect(instance).toHaveProperty('foo', null);
    expect(instance).toHaveProperty('isNewRecord', true);
    expect(instance).toHaveProperty('dataValues', expect.any(Object));
    expect(instance).toHaveProperty('_previousDataValues', expect.any(Object));
    expect(instance).toHaveProperty('get', expect.any(Function));
    expect(instance).toHaveProperty('set', expect.any(Function));
    expect(instance).toHaveProperty('changed', expect.any(Function));
    expect(instance).toHaveProperty('equals', expect.any(Function));
    expect(instance).toHaveProperty('save', expect.any(Function));
    expect(instance).toHaveProperty('destroy', expect.any(Function));
    expect(instance).toHaveProperty('update', expect.any(Function));
    expect(instance).toHaveProperty('reload', expect.any(Function));
    expect(instance).toHaveProperty('toJSON', expect.any(Function));
  });

  it('makes a model instance with data', () => {
    const Model = ModelMock({ foo: { type: STRING } });

    const instance = new Model({ foo: 'bar' });
    expect(instance).toBeInstanceOf(Model);
    expect(instance).toHaveProperty('foo', 'bar');
    expect(instance).toHaveProperty('isNewRecord', true);
  });

  it('makes a model instance with a forced existence state', () => {
    const Model = ModelMock({ foo: { type: STRING } });

    const instance = new Model({ foo: 'bar' }, { isNewRecord: false });
    expect(instance).toBeInstanceOf(Model);
    expect(instance).toHaveProperty('foo', 'bar');
    expect(instance).toHaveProperty('isNewRecord', false);
  });

  describe('::mockClear()', () => {
    it('clears all mocked methods', async () => {
      const Model = await makeModelWithDirtyMocks();
      Model.mockClear();
      assertClearedMocks(Model);

      const count = Model.__count();
      expect(count).toBe(1);
      const instance = Model.__create();
      expect(instance).toHaveProperty('id', 2);
    });
  });

  describe('::mockReset()', () => {
    it('clears all mocked methods and records', async () => {
      const Model = await makeModelWithDirtyMocks();
      Model.create();
      Model.mockReset();
      assertClearedMocks(Model);

      const count = Model.__count();
      expect(count).toBe(0);
      const instance = Model.__create();
      expect(instance).toHaveProperty('id', 1);
    });

    it('reseeds data', async () => {
      const Model = await makeModelWithDirtyMocks(2);
      Model.create();
      Model.mockReset();
      assertClearedMocks(Model);

      const count = Model.__count();
      expect(count).toBe(2);
      const instance = Model.__create();
      expect(instance).toHaveProperty('id', 3);
    });
  });

  describe('::__query()', () => {
    const Model = ModelMock({ id: { type: NUMBER }, foo: { type: STRING }, baz: { type: STRING } });
    Model.__create({ id: 1, foo: 'bar', baz: 'qux' });
    Model.__create({ id: 2, foo: '123', baz: 'qux' });
    Model.__create({ id: 3, foo: 'bar', baz: 'qux' });
    Model.__create({ id: 4, foo: 'bar', baz: '123' });
    Model.__create({ id: 5, foo: '123', baz: '123' });

    it('returns a single record', () => {
      const [record] = Model.__query();
      expect(record).toBeInstanceOf(Model);
      expect(record.get()).toEqual({ id: 1, foo: 'bar', baz: 'qux' });
    });

    it('returns all records', () => {
      const records = [...Model.__query()].map((row) => row.get());
      expect(records).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 2, foo: '123', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
        { id: 5, foo: '123', baz: '123' },
      ]);
    });

    it('returns all records ordered by a column', () => {
      const records = [...Model.__query({ order: ['foo', 'DESC']})].map((row) => row.get());
      expect(records).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
        { id: 2, foo: '123', baz: 'qux' },
        { id: 5, foo: '123', baz: '123' },
      ]);
    });

    it('returns all records ordered by multiple columns', () => {
      const records = [...Model.__query({
        order: [
          ['foo', 'ASC'],
          ['id', 'DESC'],
        ],
      })].map((row) => row.get());
      expect(records).toEqual([
        { id: 5, foo: '123', baz: '123' },
        { id: 2, foo: '123', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
        { id: 3, foo: 'bar', baz: 'qux' },
        { id: 1, foo: 'bar', baz: 'qux' },
      ]);
    });

    it('only includes the selected attributes', () => {
      const [record] = Model.__query({ where: { id: 1 }, attributes: ['foo'] });
      expect(record.id).toBe(undefined);
      expect(record.foo).toBe('bar');
      expect(record.baz).toBe(undefined);
    });

    it('excludes the selected attributes', () => {
      const [record] = Model.__query({ where: { id: 1 }, attributes: { exclude: ['foo'] } });
      expect(record.id).toBe(1);
      expect(record.foo).toBe(undefined);
      expect(record.baz).toBe('qux');
    });

    it('includes the specified to-one associations', () => {
      const models = {};
      ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
        },
        associations: {
          Other: (self, target) => self.hasOne(target),
        },
      }), 0, models);
      ModelMock(() => ({
        name: 'Other',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
          ModelId: { type: NUMBER },
        },
        associations: {
          Model: (self, target) => self.belongsTo(target),
        },
      }), 0, models);

      const instance = models.Model.__create();
      const otherInstance = models.Other.__create({ ModelId: 1 });

      const [record] = models.Model.__query({ include: 'Other' });
      expect(record).toHaveProperty('Other', expect.any(models.Other));
      expect(record.Other.equals(otherInstance)).toBe(true);

      const [otherRecord] = models.Other.__query({ include: ['Model'] });
      expect(otherRecord).toHaveProperty('Model', expect.any(models.Model));
      expect(otherRecord.Model.equals(instance)).toBe(true);
    });

    it('includes the specified to-many associations', () => {
      const models = {};
      ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
        },
        associations: {
          Other: (self, target) => self.belongsToMany(target, { through: 'Through' }),
        },
      }), 0, models);
      ModelMock(() => ({
        name: 'Other',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
        },
        associations: {
          Model: (self, target) => self.belongsToMany(target, { through: 'Through' }),
        },
      }), 0, models);

      const instance = models.Model.__create();
      const otherInstance1 = models.Other.__create();
      const otherInstance2 = models.Other.__create();

      models.Through.__create({ ModelId: 1, OtherId: 1 });
      models.Through.__create({ ModelId: 1, OtherId: 2 });

      const [record] = models.Model.__query({ include: models.Other });
      expect(record).toHaveProperty('Others', expect.any(Array));
      expect(record.Others.length).toBe(2);
      expect(record.Others[0]).toBeInstanceOf(models.Other);
      expect(record.Others[1]).toBeInstanceOf(models.Other);
      expect(record.Others[0].equals(otherInstance1)).toBe(true);
      expect(record.Others[1].equals(otherInstance2)).toBe(true);

      const [otherRecord] = models.Other.__query({ include: [models.Model] });
      expect(otherRecord).toHaveProperty('Models', expect.any(Array));
      expect(otherRecord.Models.length).toBe(1);
      expect(otherRecord.Models[0]).toBeInstanceOf(models.Model);
      expect(otherRecord.Models[0].equals(instance)).toBe(true);
    });

    it('returns all records matching the specified query', () => {
      const records = [...Model.__query({
        where: {
          foo: 'bar',
          baz: 'qux',
        },
      })].map((row) => row.get());
      expect(records).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
      ]);
    });

    it('returns a limited number of records', () => {
      const records = [...Model.__query({
        where: { foo: 'bar' },
        limit: 2,
      })].map((row) => row.get());
      expect(records).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
      ]);
    });

    it('returns records with an offset', () => {
      const records = [...Model.__query({
        where: { foo: 'bar' },
        limit: 2,
        offset: 1,
      })].map((row) => row.get());
      expect(records).toEqual([
        { id: 3, foo: 'bar', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
      ]);
    });

    it('returns all records matching the specified query using equality operators', () => {
      const records1 = [...Model.__query({
        where: {
          foo: { [Op.eq]: 'bar' },
          baz: { [Op.ne]: 'qux' },
        },
      })].map((row) => row.get());
      expect(records1).toEqual([
        { id: 4, foo: 'bar', baz: '123' },
      ]);

      const records2 = [...Model.__query({
        where: {
          foo: { [Op.is]: 'bar' },
          baz: { [Op.not]: 'qux' },
        },
      })].map((row) => row.get());
      expect(records2).toEqual(records1);
    });

    it('returns all records matching the specified query using array operators', () => {
      const records1 = [...Model.__query({
        where: {
          id: [1, 2],
        },
      })].map((row) => row.get());
      expect(records1).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 2, foo: '123', baz: 'qux' },
      ]);

      const records2 = [...Model.__query({
        where: {
          id: { [Op.in]: [1, 2] },
        },
      })].map((row) => row.get());
      expect(records2).toEqual(records1);

      const records3 = [...Model.__query({
        where: {
          id: { [Op.notIn]: [3, 4, 5] },
        },
      })].map((row) => row.get());
      expect(records3).toEqual(records1);

      const records4 = [...Model.__query({
        where: {
          id: { [Op.or]: [1, 2] },
        },
      })].map((row) => row.get());
      expect(records4).toEqual(records1);
    });

    it('returns all records matching the specified query using number operators', () => {
      const records1 = [...Model.__query({
        where: {
          id: { [Op.gt]: 3 },
        },
      })].map((row) => row.get());
      expect(records1).toEqual([
        { id: 4, foo: 'bar', baz: '123' },
        { id: 5, foo: '123', baz: '123' },
      ]);

      const records2 = [...Model.__query({
        where: {
          id: { [Op.gte]: 3 },
        },
      })].map((row) => row.get());
      expect(records2).toEqual([
        { id: 3, foo: 'bar', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
        { id: 5, foo: '123', baz: '123' },
      ]);

      const records3 = [...Model.__query({
        where: {
          id: { [Op.lt]: 3 },
        },
      })].map((row) => row.get());
      expect(records3).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 2, foo: '123', baz: 'qux' },
      ]);

      const records4 = [...Model.__query({
        where: {
          id: { [Op.lte]: 3 },
        },
      })].map((row) => row.get());
      expect(records4).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 2, foo: '123', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
      ]);

      const records5 = [...Model.__query({
        where: {
          id: { [Op.between]: [2, 4] },
        },
      })].map((row) => row.get());
      expect(records5).toEqual([
        { id: 2, foo: '123', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
      ]);

      const records6 = [...Model.__query({
        where: {
          id: { [Op.notBetween]: [2, 4] },
        },
      })].map((row) => row.get());
      expect(records6).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 5, foo: '123', baz: '123' },
      ]);
    });

    it('returns all records matching the specified query using logical AND', () => {
      const records1 = [...Model.__query({
        where: {
          id: { [Op.gt]: 2, [Op.lt]: 4 },
        },
      })].map((row) => row.get());
      expect(records1).toEqual([
        { id: 3, foo: 'bar', baz: 'qux' },
      ]);

      const records2 = [...Model.__query({
        where: {
          [Op.and]: [{ foo: 'bar' }, { baz: 'qux' }],
        },
      })].map((row) => row.get());
      expect(records2).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
      ]);
    });

    it('returns all records matching the specified query using logical OR', () => {
      const records = [...Model.__query({
        where: {
          [Op.or]: [{ id: 1 }, { id: 2 }],
        },
      })].map((row) => row.get());
      expect(records).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 2, foo: '123', baz: 'qux' },
      ]);
    });

    it('returns all records matching the specified query using logical NOT', () => {
      const records = [...Model.__query({
        where: {
          [Op.not]: {
            [Op.and]: [{ foo: 'bar' }, { baz: 'qux' }],
          },
        },
      })].map((row) => row.get());
      expect(records).toEqual([
        { id: 2, foo: '123', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
        { id: 5, foo: '123', baz: '123' },
      ]);
    });

    it('returns all records matching the specified query using string operators', () => {
      const records1 = [...Model.__query({
        where: {
          foo: { [Op.like]: '%a%' },
          baz: { [Op.notLike]: '_u_' },
        },
      })].map((row) => row.get());
      expect(records1).toEqual([
        { id: 4, foo: 'bar', baz: '123' },
      ]);

      const records2 = [...Model.__query({
        where: {
          foo: { [Op.startsWith]: 'b' },
          baz: { [Op.endsWith]: '3' },
        },
      })].map((row) => row.get());
      expect(records2).toEqual([
        { id: 4, foo: 'bar', baz: '123' },
      ]);

      const records3 = [...Model.__query({
        where: {
          foo: { [Op.substring]: 'a' },
        },
      })].map((row) => row.get());
      expect(records3).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
        { id: 4, foo: 'bar', baz: '123' },
      ]);

      const records4 = [...Model.__query({
        where: {
          foo: { [Op.iLike]: '%A%' },
          baz: { [Op.notILike]: '%U%' },
        },
      })].map((row) => row.get());
      expect(records4).toEqual([
        { id: 4, foo: 'bar', baz: '123' },
      ]);

      const records5 = [...Model.__query({
        where: {
          foo: { [Op.regexp]: '^[b]' },
          baz: { [Op.notRegexp]: /[0-9]+/ },
        },
      })].map((row) => row.get());
      expect(records5).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
      ]);

      const records6 = [...Model.__query({
        where: {
          foo: { [Op.iRegexp]: '^[B]' },
          baz: { [Op.notIRegexp]: /[A-Z]+/ },
        },
      })].map((row) => row.get());
      expect(records6).toEqual([
        { id: 4, foo: 'bar', baz: '123' },
      ]);
    });

    it('returns all records matching the specified query using another column\'s value', () => {
      const records = [...Model.__query({
        where: {
          foo: { [Op.col]: 'baz' },
        },
      })].map((row) => row.get());
      expect(records).toEqual([
        { id: 5, foo: '123', baz: '123' },
      ]);
    });

    it('throws on when querying with unsupported operators', () => {
      const unsupported = [
        Op.all,
        Op.any,
        Op.match,
        Op.contains,
        Op.contained,
        Op.overlap,
        Op.adjacent,
        Op.strictLeft,
        Op.strictRight,
        Op.noExtendLeft,
        Op.noExtendRight,
      ];
      for (const operator of unsupported) {
        expect(() => Model.__query({ where: { foo: { [operator]: null } } }).next()).toThrow();
      }
    });
  });

  describe('::build()', () => {
    it('makes a model instance', () => {
      const Model = ModelMock({ foo: { type: STRING } });

      const instance = Model.build();
      expect(instance).toBeInstanceOf(Model);
      expect(instance).toHaveProperty('isNewRecord', true);
      expect(instance).toHaveProperty('foo', null);
      expect(instance.save).not.toHaveBeenCalled();
    });

    it('makes a model instance with data', () => {
      const Model = ModelMock({ foo: { type: STRING } });

      const instance = Model.build({ foo: 'bar' });
      expect(instance).toBeInstanceOf(Model);
      expect(instance).toHaveProperty('isNewRecord', true);
      expect(instance).toHaveProperty('foo', 'bar');
      expect(instance.save).not.toHaveBeenCalled();
    });
  });

  describe('::create()', () => {
    it('makes a model instance and saves it', async () => {
      const Model = ModelMock({ foo: { type: STRING } });

      const instance = await Model.create();
      expect(instance).toBeInstanceOf(Model);
      expect(instance).toHaveProperty('isNewRecord', false);
      expect(instance).toHaveProperty('foo', null);

      const persisted = Model.__findOne();
      expect(persisted.get()).toEqual({ foo: null });
    });

    it('makes a model instance with data', async () => {
      const Model = ModelMock({ foo: { type: STRING } });

      const instance = await Model.create({ foo: 'bar' });
      expect(instance).toBeInstanceOf(Model);
      expect(instance).toHaveProperty('isNewRecord', false);
      expect(instance).toHaveProperty('foo', 'bar');

      const persisted = Model.__findOne();
      expect(persisted.get()).toEqual({ foo: 'bar' });
    });
  });

  describe('::findByPk()', () => {
    it('returns an instance with the specified primary key value', async () => {
      const Model = ModelMock({ id: { primaryKey: true, type: STRING  }, foo: { type: STRING } });
      Model.__create({ id: 1, foo: 'bar' });
      Model.__create({ id: 2, foo: 'baz' });

      const instance = await Model.findByPk(2);
      expect(instance).toBeInstanceOf(Model);
      expect(instance).toHaveProperty('isNewRecord', false);
      expect(instance).toHaveProperty('foo', 'baz');
    });

    it('returns null when no instance with the specified primary key value exists', async () => {
      const Model = ModelMock({ id: { primaryKey: true, type: NUMBER }, foo: { type: STRING } });
      Model.__create({ id: 1, foo: 'bar' });
      Model.__create({ id: 2, foo: 'baz' });

      const instance = await Model.findByPk(3);
      expect(instance).toBe(null);
    });
  });

  describe('::findAll()', () => {
    it('returns all records', async () => {
      const Model = ModelMock({});
      Model.__create();
      Model.__create();

      const records = await Model.findAll();
      expect(records).toBeInstanceOf(Array);
      expect(records).toEqual([expect.any(Model), expect.any(Model)]);
    });

    it('returns all records matching the specified query', async () => {
      const Model = ModelMock({ id: { type: NUMBER }, foo: { type: STRING }, baz: { type: STRING } });
      Model.__create({ id: 1, foo: 'bar', baz: 'qux' });
      Model.__create({ id: 2, foo: '123', baz: 'qux' });
      Model.__create({ id: 3, foo: 'bar', baz: 'qux' });
      Model.__create({ id: 4, foo: 'bar', baz: '123' });
      Model.__create({ id: 5, foo: '123', baz: '123' });

      const records = await Model.findAll({ where: { foo: 'bar', baz: 'qux' } });
      expect(records.map((row) => row.get())).toEqual([
        { id: 1, foo: 'bar', baz: 'qux' },
        { id: 3, foo: 'bar', baz: 'qux' },
      ]);
    });

    it('returns an empty array if there are no records', async () => {
      const Model = ModelMock({});

      const records = await Model.findAll();
      expect(records).toBeInstanceOf(Array);
      expect(records.length).toBe(0);
    });
  });

  describe('::count()', () => {
    it('returns the count of all records', async () => {
      const Model = ModelMock({});
      Model.__create();
      Model.__create();

      const count = await Model.count();
      expect(count).toBe(2);
    });

    it('returns the count of all records matching the specified query', async () => {
      const Model = ModelMock({ foo: { type: STRING }, baz: { type: STRING } });
      Model.__create({ foo: 'bar', baz: 'qux' });
      Model.__create({ foo: '123', baz: 'qux' });
      Model.__create({ foo: 'bar', baz: 'qux' });
      Model.__create({ foo: 'bar', baz: '123' });
      Model.__create({ foo: '123', baz: '123' });

      const count = await Model.count({ where: { foo: 'bar', baz: 'qux' } });
      expect(count).toBe(2);
    });

    it('returns 0 if there are no records', async () => {
      const Model = ModelMock({});

      const count = await Model.count();
      expect(count).toBe(0);
    });
  });

  describe('::findOne()', () => {
    it('returns the first record', async () => {
      const Model = ModelMock({ foo: { type: STRING } });
      Model.__create({ foo: 'bar' });

      const instance = await Model.findOne();
      expect(instance).toBeInstanceOf(Model);
      expect(instance.get()).toEqual({ foo: 'bar' });
    });

    it('returns the first record matching the specified query', async () => {
      const Model = ModelMock({ id: { type: NUMBER }, foo: { type: STRING }, baz: { type: STRING } });
      Model.__create({ id: 1, foo: '123', baz: 'qux' });
      Model.__create({ id: 2, foo: 'bar', baz: 'qux' });
      Model.__create({ id: 3, foo: 'bar', baz: '123' });
      Model.__create({ id: 4, foo: 'bar', baz: 'qux' });
      Model.__create({ id: 5, foo: '123', baz: '123' });

      const instance = await Model.findOne({ where: { foo: 'bar', baz: 'qux' } });
      expect(instance.get()).toEqual({ id: 2, foo: 'bar', baz: 'qux' });
    });

    it('returns null array if there are no records', async () => {
      const Model = ModelMock({});
      const instance = await Model.findOne();
      expect(instance).toBe(null);
    });
  });

  describe('::update()', () => {
    it('updates all records', async () => {
      const Model = ModelMock({ foo: { type: STRING } });
      Model.__create({ foo: 'bar' });
      Model.__create({ foo: 'baz' });

      await Model.update({ foo: 'qux' });
      const records = Model.__findAll();
      expect(records.map((row) => row.get())).toEqual([{ foo: 'qux' }, { foo: 'qux' }]);
    });

    it('updates all records matching the specified query', async () => {
      const Model = ModelMock({ foo: { type: STRING } });
      Model.__create({ foo: 'bar' });
      Model.__create({ foo: 'baz' });

      await Model.update({ foo: 'qux' }, { where: { foo: 'baz' } });
      const records = Model.__findAll();
      expect(records.map((row) => row.get())).toEqual([{ foo: 'bar' }, { foo: 'qux' }]);
    });
  });

  describe('::destroy()', () => {
    it('destroys all records', async () => {
      const Model = ModelMock({ foo: { type: STRING } });
      Model.__create({ foo: 'bar' });
      Model.__create({ foo: 'baz' });

      await Model.destroy();
      const count = Model.__count();
      expect(count).toBe(0);
    });

    it('destroys all records matching the specified query', async () => {
      const Model = ModelMock({ foo: { type: STRING } });
      Model.__create({ foo: 'bar' });
      Model.__create({ foo: 'baz' });

      await Model.destroy({ where: { foo: 'baz' } });
      const records = Model.__findAll();
      expect(records.length).toBe(1);
      expect(records[0].get()).toEqual({ foo: 'bar' });
    });
  });

  describe('::belongsTo()', () => {
    const makeAssociatedModels = (models = {}) => {
      ModelMock(() => ({
        name: 'Model',
        definition: {
          OtherModelFoo: { type: STRING },
        },
        associations: {
          OtherModel: (self, target) => self.belongsTo(target, {
            as: 'otherModel',
            foreignKey: 'OtherModelFoo',
            targetKey: 'foo',
          }),
        },
      }), 0, models);

      ModelMock(() => ({
        name: 'OtherModel',
        definition: {
          id: { type: NUMBER, primaryKey: true },
          foo: { type: STRING },
        },
      }), 0, models);

      return models;
    };

    it('configures a 1:1 / N:1 association', () => {
      const Model = ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true },
          parentModelId: { type: NUMBER },
        },
        associations: {
          Model: (self, target) => self.belongsTo(target, {
            as: 'parent',
            foreignKey: {
              name: 'parentModelId',
              allowNull: true,
              type: NUMBER,
            },
            targetKey: 'id',
          }),
        },
      }));
      expect(Model.__associations).toEqual([{
        options: {
          as: 'parent',
          foreignKey: {
            name: 'parentModelId',
            allowNull: true,
            type: NUMBER,
          },
          targetKey: 'id',
        },
        target: Model,
        type: 'belongsTo',
        methods: [
          ['getParent', 'get'],
          ['setParent', 'set'],
          ['createParent', 'create'],
        ],
      }]);

      Model.belongsTo(Model, {
        as: 'otherModel',
        foreignKey: 'otherModelId',
        targetKey: 'id',
      });
      expect(Model.__associations[1].options).toEqual({
        as: 'otherModel',
        foreignKey: {
          name: 'otherModelId',
          allowNull: true,
          type: NUMBER,
        },
        targetKey: 'id',
      });

      Model.belongsTo(Model);
      expect(Model.__associations[2].options).toEqual({
        as: 'Model',
        foreignKey: {
          name: 'ModelId',
          allowNull: true,
          type: NUMBER,
        },
        targetKey: 'id',
      });

      const instance = Model.__create({ id: 1 });
      expect(instance).toHaveProperty('getParent', expect.any(Function));
      expect(instance).toHaveProperty('setParent', expect.any(Function));
      expect(instance).toHaveProperty('createParent', expect.any(Function));
    });

    describe('.createOTHER()', () => {
      it('creates a remote instance and associates this one with it', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create();
        const otherInstance = await instance.createOtherModel({ id: 1, foo: 'bar' });
        expect(otherInstance).toBeInstanceOf(OtherModel);
        expect(otherInstance.get()).toEqual({ id: 1, foo: 'bar' });
      });
    });

    describe('.setOTHER()', () => {
      it('associates with the remote instance', async () => {
        const { Model, OtherModel } = makeAssociatedModels();

        const instance1 = Model.__create();
        const otherInstance = OtherModel.__create({ id: 1, foo: 'bar' });

        await instance1.setOtherModel(otherInstance);
        expect(instance1.OtherModelFoo).toBe('bar');

        const instance2 = Model.__create();
        await instance2.setOtherModel(otherInstance.id)
        expect(instance2.OtherModelFoo).toBe('bar');

        instance1.__reload();
        expect(instance1.OtherModelFoo).toBe(null);

        await instance2.setOtherModel(null)
        expect(instance2.OtherModelFoo).toBe(null);
      });
    });

    describe('.getOTHER()', () => {
      it('returns the remote instance', async () => {
        const { Model, OtherModel } = makeAssociatedModels();

        const instance = Model.__create();
        const otherInstance = OtherModel.__create({ id: 1, foo: 'bar' });

        await expect(instance.getOtherModel()).resolves.toBe(null);
        instance.__update({ OtherModelFoo: 'bar' });

        const instance_otherInstance = await instance.getOtherModel();
        expect(instance_otherInstance).toBeInstanceOf(OtherModel);
        expect(instance_otherInstance.get()).toEqual(otherInstance.get());
      });
    });
  });

  describe('::belongsToMany()', () => {
    const makeAssociatedModels = (models = {}) => {
      ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
        },
        associations: {
          OtherModel: (self, target) => self.belongsToMany(target, {
            through: 'ThroughModel',
          }),
        },
      }), 0, models);

      ModelMock(() => ({
        name: 'OtherModel',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
        },
      }), 0, models);

      return models;
    };

    it('configures a N:M association', () => {
      const models = {};
      const ModelModel = ModelMock(() => ({
        name: 'ModelModel',
        definition: {
          ModelId: { type: NUMBER },
          parentId: { type: NUMBER },
        },
      }), 0, models);
      const Model = ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true },
        },
        associations: {
          Model: (self, target) => self.belongsToMany(target, {
            as: 'parents',
            through: {
              model: ModelModel,
            },
            sourceKey: 'id',
            foreignKey: {
              name: 'parentId',
              allowNull: false,
              type: NUMBER,
            },
            targetKey: 'id',
            otherKey: {
              name: 'ModelId',
              allowNull: false,
              type: NUMBER,
            },
          }),
        },
      }), 0, models);
      expect(Model.__associations).toEqual([{
        options: {
          as: 'parents',
          through: {
            model: ModelModel,
          },
          sourceKey: 'id',
          foreignKey: {
            name: 'parentId',
            allowNull: false,
            type: NUMBER,
          },
          targetKey: 'id',
          otherKey: {
            name: 'ModelId',
            allowNull: false,
            type: NUMBER,
          },
        },
        target: Model,
        type: 'belongsToMany',
        methods: [
          ['getParents', 'get'],
          ['countParents', 'count'],
          ['hasParent', 'has'],
          ['hasParents', 'has'],
          ['setParents', 'set'],
          ['addParent', 'add'],
          ['addParents', 'add'],
          ['removeParent', 'remove'],
          ['removeParents', 'remove'],
          ['createParent', 'create'],
        ],
      }]);

      Model.belongsToMany(Model, {
        as: 'parents2',
        foreignKey: 'm1',
        otherKey: 'm2',
        through: 'ModelJoin'
      });
      expect(Model.__associations[1].options).toEqual({
        as: 'parents2',
        through: {
          model: models.ModelJoin,
        },
        sourceKey: 'id',
        foreignKey: {
          name: 'm1',
          allowNull: false,
          type: NUMBER,
        },
        targetKey: 'id',
        otherKey: {
          name: 'm2',
          allowNull: false,
          type: NUMBER,
        },
      });
      assertModelClass(models.ModelJoin);
      expect(models.ModelJoin).toHaveProperty('name', 'ModelJoin');

      const Other = ModelMock(() => ({
        name: 'Other',
        definition: {
          id: { type: NUMBER, primaryKey: true },
        },
      }), 0, models);
      const ModelOther = ModelMock(() => ({
        name: 'ModelOther',
        definition: {
          ModelId: { type: NUMBER },
          parentId: { type: NUMBER },
        },
      }), 0, models);

      Model.belongsToMany(Other, { through: 'ModelOther' });
      expect(Model.__associations[2].options).toEqual({
        as: 'Others',
        through: {
          model: ModelOther,
        },
        sourceKey: 'id',
        foreignKey: {
          name: 'ModelId',
          allowNull: false,
          type: NUMBER,
        },
        targetKey: 'id',
        otherKey: {
          name: 'OtherId',
          allowNull: false,
          type: NUMBER,
        },
      });

      const instance = Model.__create({ id: 1 });
      expect(instance).toHaveProperty('getParents', expect.any(Function));
      expect(instance).toHaveProperty('countParents', expect.any(Function));
      expect(instance).toHaveProperty('hasParent', expect.any(Function));
      expect(instance).toHaveProperty('hasParents', expect.any(Function));
      expect(instance).toHaveProperty('setParents', expect.any(Function));
      expect(instance).toHaveProperty('addParent', expect.any(Function));
      expect(instance).toHaveProperty('addParents', expect.any(Function));
      expect(instance).toHaveProperty('removeParent', expect.any(Function));
      expect(instance).toHaveProperty('removeParents', expect.any(Function));
      expect(instance).toHaveProperty('createParent', expect.any(Function));
    });

    describe('.createOTHER()', () => {
      it('creates a remote instance and associates it with this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        const otherInstance1 = await instance.createOtherModel();
        expect(otherInstance1).toBeInstanceOf(OtherModel);
        expect(otherInstance1.get()).toEqual({ id: 1 });
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeTruthy();

        const otherInstance2 = await instance.createOtherModel();
        expect(otherInstance2).toBeInstanceOf(OtherModel);
        expect(otherInstance2.get()).toEqual({ id: 2 });
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 2 } })).toBeTruthy();
      });
    });

    describe('.countOTHERS()', () => {
      it('returns the number of remote instances associated with this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        await expect(instance.countOtherModels()).resolves.toBe(0);

        OtherModel.__create();
        ThroughModel.create({ ModelId: 1, OtherModelId: 1 });
        await expect(instance.countOtherModels()).resolves.toBe(1);

        OtherModel.__create();
        ThroughModel.create({ ModelId: 1, OtherModelId: 2 });
        await expect(instance.countOtherModels()).resolves.toBe(2);
      });
    });

    describe('.hasOTHER()', () => {
      it('returns whether the remote instance is associated with this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        const otherInstance1 = OtherModel.__create();
        ThroughModel.create({ ModelId: 1, OtherModelId: 1 });
        await expect(instance.hasOtherModel(otherInstance1)).resolves.toBe(true);
        await expect(instance.hasOtherModel(otherInstance1.id)).resolves.toBe(true);

        const otherInstance2 = OtherModel.__create();
        await expect(instance.hasOtherModel(otherInstance2)).resolves.toBe(false);
      });
    });

    describe('.hasOTHERS()', () => {
      it('returns whether all remote instances are associated with this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        const otherInstance1 = OtherModel.__create();
        ThroughModel.create({ ModelId: 1, OtherModelId: 1 });
        await expect(instance.hasOtherModels([otherInstance1])).resolves.toBe(true);

        const otherInstance2 = OtherModel.__create();
        await expect(instance.hasOtherModels([otherInstance1, otherInstance2])).resolves.toBe(false);

        ThroughModel.create({ ModelId: 1, OtherModelId: 2 });
        await expect(instance.hasOtherModels([otherInstance1, otherInstance2.id])).resolves.toBe(true);
      });
    });

    describe('.addOTHER()', () => {
      it('associates the remote instance with this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        const otherInstance1 = OtherModel.__create();
        await instance.addOtherModel(otherInstance1);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeTruthy();

        const otherInstance2 = OtherModel.__create();
        await instance.addOtherModel(otherInstance2.id);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 2 } })).toBeTruthy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeTruthy();
      });
    });

    describe('.addOTHERS()', () => {
      it('associates the remote instances with this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        const otherInstance1 = OtherModel.__create();
        await instance.addOtherModels([otherInstance1]);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeTruthy();

        const otherInstance2 = OtherModel.__create();
        const otherInstance3 = OtherModel.__create();
        await instance.addOtherModels([otherInstance2, otherInstance3.id]);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 2 } })).toBeTruthy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 3 } })).toBeTruthy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeTruthy();
      });
    });

    describe('.removeOTHER()', () => {
      it('disassociates the remote instance from this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();
        const otherInstance = OtherModel.__create();
        ThroughModel.create({ ModelId: 1, OtherModelId: 1 });

        await instance.removeOtherModel(otherInstance);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeFalsy();

        ThroughModel.create({ ModelId: 1, OtherModelId: 1 });
        await instance.removeOtherModel(otherInstance.id);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeFalsy();
      });
    });

    describe('.removeOTHERS()', () => {
      it('disassociates the remote instances from this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        const otherInstance1 = OtherModel.__create();
        const otherInstance2 = OtherModel.__create();
        const otherInstance3 = OtherModel.__create();
        ThroughModel.create({ ModelId: 1, OtherModelId: 1 });
        ThroughModel.create({ ModelId: 1, OtherModelId: 2 });
        ThroughModel.create({ ModelId: 1, OtherModelId: 3 });

        await instance.removeOtherModels([otherInstance1]);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeFalsy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 2 } })).toBeTruthy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 3 } })).toBeTruthy();


        await instance.removeOtherModels([otherInstance2, otherInstance3.id]);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeFalsy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 2 } })).toBeFalsy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 3 } })).toBeFalsy();
      });
    });

    describe('.setOTHERS()', () => {
      it('sets which remote instances are associated with this one', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();
        const instance = Model.__create();

        const otherInstance1 = OtherModel.__create();
        await instance.setOtherModels(otherInstance1);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeTruthy();

        const otherInstance2 = OtherModel.__create();
        await instance.setOtherModels([otherInstance2.id]);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeFalsy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 2 } })).toBeTruthy();

        await instance.setOtherModels(null);
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 1 } })).toBeFalsy();
        expect(ThroughModel.__findOne({ where: { ModelId: 1, OtherModelId: 2 } })).toBeFalsy();
      });
    });

    describe('.getOTHERS()', () => {
      it('returns the remote instance', async () => {
        const { Model, OtherModel, ThroughModel } = makeAssociatedModels();

        const instance = Model.__create();
        const otherInstance1 = OtherModel.__create();
        const otherInstance2 = OtherModel.__create();

        await expect(instance.getOtherModels()).resolves.toEqual([]);
        ThroughModel.create({ ModelId: 1, OtherModelId: 1 });
        ThroughModel.create({ ModelId: 1, OtherModelId: 2 });

        const instance_otherInstances = await instance.getOtherModels();
        expect(instance_otherInstances).toBeInstanceOf(Array);
        expect(instance_otherInstances.length).toBe(2);
        expect(instance_otherInstances[0]).toBeInstanceOf(OtherModel);
        expect(instance_otherInstances[1]).toBeInstanceOf(OtherModel);
        expect(instance_otherInstances[0].get()).toEqual(otherInstance1.get());
        expect(instance_otherInstances[1].get()).toEqual(otherInstance2.get());
      });
    });
  });

  describe('::hasOne()', () => {
    const makeAssociatedModels = (models = {}) => {
      ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true },
          foo: { type: STRING },
        },
        associations: {
          OtherModel: (self, target) => self.hasOne(target, {
            as: 'otherModel',
            foreignKey: 'ModelFoo',
            sourceKey: 'foo',
          }),
        },
      }), 0, models);

      ModelMock(() => ({
        name: 'OtherModel',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
          ModelFoo: { type: STRING },
        },
      }), 0, models);

      return models;
    };

    it('configures a 1:1 association', () => {
      const Model = ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true },
          parent: { type: NUMBER },
          otherModelId: { type: NUMBER },
        },
        associations: {
          Model: (self, target) => self.hasOne(target, {
            as: 'child',
            foreignKey: {
              name: 'parent',
              allowNull: true,
              type: NUMBER,
            },
            sourceKey: 'id',
          }),
        },
      }));
      expect(Model.__associations).toEqual([{
        options: {
          as: 'child',
          foreignKey: {
            name: 'parent',
            allowNull: true,
            type: NUMBER,
          },
          sourceKey: 'id',
        },
        target: Model,
        type: 'hasOne',
        methods: [
          ['getChild', 'get'],
          ['setChild', 'set'],
          ['createChild', 'create'],
        ],
      }]);

      Model.hasOne(Model, {
        as: 'otherModel',
        foreignKey: 'otherModelId',
        sourceKey: 'id',
      });
      expect(Model.__associations[1].options).toEqual({
        as: 'otherModel',
        foreignKey: {
          name: 'otherModelId',
          allowNull: true,
          type: NUMBER,
        },
        sourceKey: 'id',
      });

      Model.hasOne(Model);
      expect(Model.__associations[2].options).toEqual({
        as: 'Model',
        foreignKey: {
          name: 'ModelId',
          allowNull: true,
          type: NUMBER,
        },
        sourceKey: 'id',
      });

      const instance = Model.__create({ id: 1 });
      expect(instance).toHaveProperty('getChild', expect.any(Function));
      expect(instance).toHaveProperty('setChild', expect.any(Function));
      expect(instance).toHaveProperty('createChild', expect.any(Function));
    });

    describe('.createOTHER()', () => {
      it('creates a remote instance and associates it with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });
        const otherInstance = await instance.createOtherModel();
        expect(otherInstance).toBeInstanceOf(OtherModel);
        expect(otherInstance.get()).toEqual({ id: 1, ModelFoo: 'bar' });
      });
    });

    describe('.setOTHER()', () => {
      it('associates the remote instance', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = OtherModel.__create();
        await instance.setOtherModel(otherInstance1);
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe('bar');

        const otherInstance2 = OtherModel.__create();
        await instance.setOtherModel(otherInstance2.id);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe('bar');
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe(null);

        await instance.setOtherModel(null);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe(null);
      });
    });

    describe('.getOTHER()', () => {
      it('returns the remote instance', async () => {
        const { Model, OtherModel } = makeAssociatedModels();

        const instance = Model.__create({ id: 1, foo: 'bar' });

        await expect(instance.getOtherModel()).resolves.toBe(null);
        const otherInstance = OtherModel.__create({ id: 1, ModelFoo: 'bar' });

        const instance_otherInstance = await instance.getOtherModel();
        expect(instance_otherInstance).toBeInstanceOf(OtherModel);
        expect(instance_otherInstance.get()).toEqual(otherInstance.get());
      });
    });
  });

  describe('::hasMany()', () => {
    const makeAssociatedModels = (models = {}) => {
      ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true },
          foo: { type: STRING },
        },
        associations: {
          OtherModel: (self, target) => self.hasMany(target, {
            as: 'otherModels',
            foreignKey: 'ModelFoo',
            sourceKey: 'foo',
          }),
        },
      }), 0, models);

      ModelMock(() => ({
        name: 'OtherModel',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
          ModelFoo: { type: STRING },
        },
      }), 0, models);

      return models;
    };

    it('configures a 1:M association', () => {
      const Model = ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true },
          parent: { type: NUMBER },
          otherModelId: { type: NUMBER },
        },
        associations: {
          Model: (self, target) => self.hasMany(target, {
            as: 'children',
            foreignKey: {
              name: 'parent',
              allowNull: true,
              type: NUMBER,
            },
            sourceKey: 'id',
          }),
        },
      }));
      expect(Model.__associations).toEqual([{
        options: {
          as: 'children',
          foreignKey: {
            name: 'parent',
            allowNull: true,
            type: NUMBER,
          },
          sourceKey: 'id',
        },
        target: Model,
        type: 'hasMany',
        methods: [
          ['getChildren', 'get'],
          ['countChildren', 'count'],
          ['hasChild', 'has'],
          ['hasChildren', 'has'],
          ['setChildren', 'set'],
          ['addChild', 'add'],
          ['addChildren', 'add'],
          ['removeChild', 'remove'],
          ['removeChildren', 'remove'],
          ['createChild', 'create'],
        ],
      }]);

      Model.hasMany(Model, {
        as: 'otherModels',
        foreignKey: 'otherModelId',
        sourceKey: 'id',
      });
      expect(Model.__associations[1].options).toEqual({
        as: 'otherModels',
        foreignKey: {
          name: 'otherModelId',
          allowNull: true,
          type: NUMBER,
        },
        sourceKey: 'id',
      });

      Model.hasMany(Model);
      expect(Model.__associations[2].options).toEqual({
        as: 'Models',
        foreignKey: {
          name: 'ModelId',
          allowNull: true,
          type: NUMBER,
        },
        sourceKey: 'id',
      });

      const instance = Model.__create({ id: 1 });
      expect(instance).toHaveProperty('getChildren', expect.any(Function));
      expect(instance).toHaveProperty('countChildren', expect.any(Function));
      expect(instance).toHaveProperty('hasChild', expect.any(Function));
      expect(instance).toHaveProperty('hasChildren', expect.any(Function));
      expect(instance).toHaveProperty('setChildren', expect.any(Function));
      expect(instance).toHaveProperty('addChild', expect.any(Function));
      expect(instance).toHaveProperty('addChildren', expect.any(Function));
      expect(instance).toHaveProperty('removeChild', expect.any(Function));
      expect(instance).toHaveProperty('removeChildren', expect.any(Function));
      expect(instance).toHaveProperty('createChild', expect.any(Function));
    });

    describe('.createOTHER()', () => {
      it('creates a remote instance and associates it with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = await instance.createOtherModel({ id: 1 });
        expect(otherInstance1).toBeInstanceOf(OtherModel);
        expect(otherInstance1.get()).toEqual({ id: 1, ModelFoo: 'bar' });

        const otherInstance2 = await instance.createOtherModel();
        expect(otherInstance2).toBeInstanceOf(OtherModel);
        expect(otherInstance2.get()).toEqual({ id: 2, ModelFoo: 'bar' });

        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe('bar');
      });
    });

    describe('.countOTHERS()', () => {
      it('returns the number of remote instances associated with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        await expect(instance.countOtherModels()).resolves.toBe(0);

        OtherModel.__create({ ModelFoo: 'bar' });
        await expect(instance.countOtherModels()).resolves.toBe(1);

        OtherModel.__create({ ModelFoo: 'bar' });
        await expect(instance.countOtherModels()).resolves.toBe(2);
      });
    });

    describe('.hasOTHER()', () => {
      it('returns whether the remote instance is associated with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = OtherModel.__create({ ModelFoo: 'bar' });
        await expect(instance.hasOtherModel(otherInstance1)).resolves.toBe(true);
        await expect(instance.hasOtherModel(otherInstance1.id)).resolves.toBe(true);

        const otherInstance2 = OtherModel.__create();
        await expect(instance.hasOtherModel(otherInstance2)).resolves.toBe(false);
      });
    });

    describe('.hasOTHERS()', () => {
      it('returns whether all remote instances are associated with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = OtherModel.__create({ ModelFoo: 'bar' });
        await expect(instance.hasOtherModels([otherInstance1])).resolves.toBe(true);

        const otherInstance2 = OtherModel.__create();
        await expect(instance.hasOtherModels([otherInstance1, otherInstance2])).resolves.toBe(false);

        otherInstance2.__update({ ModelFoo: 'bar' });
        await expect(instance.hasOtherModels([otherInstance1, otherInstance2.id])).resolves.toBe(true);
      });
    });

    describe('.addOTHER()', () => {
      it('associates the remote instance with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = OtherModel.__create();
        await instance.addOtherModel(otherInstance1);
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe('bar');

        const otherInstance2 = OtherModel.__create();
        await instance.addOtherModel(otherInstance2.id);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe('bar');

        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe('bar');
      });
    });

    describe('.addOTHERS()', () => {
      it('associates the remote instances with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = OtherModel.__create();
        await instance.addOtherModels([otherInstance1]);
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe('bar');

        const otherInstance2 = OtherModel.__create();
        const otherInstance3 = OtherModel.__create();
        await instance.addOtherModels([otherInstance2, otherInstance3.id]);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe('bar');
        otherInstance3.__reload();
        expect(otherInstance3.ModelFoo).toBe('bar');

        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe('bar');
      });
    });

    describe('.removeOTHER()', () => {
      it('disassociates the remote instance from this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance = OtherModel.__create({ ModelFoo: 'bar' });
        await instance.removeOtherModel(otherInstance);
        otherInstance.__reload();
        expect(otherInstance.ModelFoo).toBe(null);

        otherInstance.__update({ ModelFoo: 'bar' });
        await instance.removeOtherModel(otherInstance.id);
        otherInstance.__reload();
        expect(otherInstance.ModelFoo).toBe(null);
      });
    });

    describe('.removeOTHERS()', () => {
      it('disassociates the remote instances from this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = OtherModel.__create({ ModelFoo: 'bar' });
        const otherInstance2 = OtherModel.__create({ ModelFoo: 'bar' });
        const otherInstance3 = OtherModel.__create({ ModelFoo: 'bar' });

        await instance.removeOtherModels([otherInstance1]);
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe(null);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe('bar');
        otherInstance3.__reload();
        expect(otherInstance3.ModelFoo).toBe('bar');


        await instance.removeOtherModels([otherInstance2, otherInstance3.id]);
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe(null);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe(null);
        otherInstance3.__reload();
        expect(otherInstance3.ModelFoo).toBe(null);
      });
    });

    describe('.setOTHERS()', () => {
      it('sets which remote instances are associated with this one', async () => {
        const { Model, OtherModel } = makeAssociatedModels();
        const instance = Model.__create({ id: 1, foo: 'bar' });

        const otherInstance1 = OtherModel.__create();
        await instance.setOtherModels(otherInstance1);
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe('bar');

        const otherInstance2 = OtherModel.__create();
        await instance.setOtherModels([otherInstance2.id]);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe('bar');
        otherInstance1.__reload();
        expect(otherInstance1.ModelFoo).toBe(null);

        await instance.setOtherModels(null);
        otherInstance2.__reload();
        expect(otherInstance2.ModelFoo).toBe(null);
      });
    });

    describe('.getOTHERS()', () => {
      it('returns the remote instance', async () => {
        const { Model, OtherModel } = makeAssociatedModels();

        const instance = Model.__create({ id: 1, foo: 'bar' });

        await expect(instance.getOtherModels()).resolves.toEqual([]);
        const otherInstance1 = OtherModel.__create({ ModelFoo: 'bar' });
        const otherInstance2 = OtherModel.__create({ ModelFoo: 'bar' });

        const instance_otherInstances = await instance.getOtherModels();
        expect(instance_otherInstances).toBeInstanceOf(Array);
        expect(instance_otherInstances.length).toBe(2);
        expect(instance_otherInstances[0]).toBeInstanceOf(OtherModel);
        expect(instance_otherInstances[1]).toBeInstanceOf(OtherModel);
        expect(instance_otherInstances[0].get()).toEqual(otherInstance1.get());
        expect(instance_otherInstances[1].get()).toEqual(otherInstance2.get());
      });
    });
  });

  describe('::__records', () => {
    it('contains all record data', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      expect(Model.__records.size).toBe(0);

      Model.__create({ foo: 'bar' });
      expect(Model.__records.size).toBe(1);

      const instance = Model.build({ foo: 'baz' });
      expect(Model.__records.size).toBe(1);

      instance.__save();
      expect(Model.__records.size).toBe(2);

      expect([...Model.__records.values()]).toEqual([{ foo: 'bar' }, { foo: 'baz' }]);
    });
  });

  describe('.get()', () => {
    it('gets the value of the specified field', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.build({ foo: 'bar'});

      expect(instance.get('foo')).toBe('bar');
    });

    it('returns all data values if called without an argument', () => {
      const Model = ModelMock({ foo: { type: STRING }, bar: { type: STRING } });
      const instance = Model.build({ bar: 'baz' });

      const row = instance.get();
      expect(row).toEqual(instance.dataValues);
    });

    it('returns all associated instances', () => {
      const models = {};
      ModelMock(() => ({
        name: 'Model',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
        },
        associations: {
          Other: (self, target) => self.hasMany(target),
        },
      }), 0, models);
      ModelMock(() => ({
        name: 'Other',
        definition: {
          id: { type: NUMBER, primaryKey: true, autoIncrement: true },
          ModelId: { type: NUMBER },
        },
      }), 0, models);

      models.Model.__create();
      const otherInstance1 = models.Other.__create({ ModelId: 1 });
      const otherInstance2 = models.Other.__create({ ModelId: 1 });

      const record = models.Model.__findOne({ include: [{ as: 'Others', model: models.Other }] });
      const otherInstances = record.get('Others');
      expect(otherInstances).toBeInstanceOf(Array);
      expect(otherInstances.length).toBe(2);
      expect(otherInstances[0]).toBeInstanceOf(models.Other);
      expect(otherInstances[1]).toBeInstanceOf(models.Other);
      expect(otherInstances[0].equals(otherInstance1)).toBe(true);
      expect(otherInstances[1].equals(otherInstance2)).toBe(true);

      const row = record.get();
      expect(row).toEqual({ id: 1, Others: otherInstances });
    });
  });

  describe('.set()', () => {
    it('sets the value of existing fields', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.build();

      instance.set('foo', 'bar');
      expect(instance).toHaveProperty('foo', 'bar');
    });

    it('sets the value the instance fields using an object', () => {
      const Model = ModelMock({ foo: { type: STRING }, bar: { type: STRING }, baz: { type: STRING } });
      const instance = Model.build();

      instance.set({ foo: 'qux', baz: 'quux' });
      expect(instance).toHaveProperty('foo', 'qux');
      expect(instance).toHaveProperty('bar', null);
      expect(instance).toHaveProperty('baz', 'quux');
    });

    it('does not set the value of non-existent fields', () => {
      const Model = ModelMock({});
      const instance = Model.build();

      instance.set('foo', 'bar');
      expect(instance).not.toHaveProperty('foo', 'bar');
    });
  });

  describe('.changed()', () => {
    it('returns true when calling with a changed field', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.__create({ foo: 'bar' });

      instance.foo = 'baz';
      expect(instance.changed('foo')).toBe(true);
    });

    it('returns false when calling with an unchanged field', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.__create({ foo: 'bar' });
      expect(instance.changed('foo')).toBe(false);
    });

    it('returns false when calling with an unchanged excluded field', async () => {
      const Model = ModelMock({ foo: { type: STRING }, baz: { type: STRING } });
      Model.__create({ foo: 'bar', baz: 'qux' });

      const instance = Model.__findOne({ attributes: ['foo'] });
      expect(instance.changed('baz')).toBe(false);
    });

    it('returns all changed fields when calling without an argument', () => {
      const Model = ModelMock({ foo: { type: NUMBER }, bar: { type: NUMBER }, baz: { type: NUMBER } });
      const instance = Model.__create({ foo: 1, bar: 2, baz: 3 });

      instance.foo = 3;
      instance.bar = 2;
      instance.baz = 1;
      expect(instance.changed()).toEqual(['foo', 'baz']);
    });
  });

  describe('.equals()', () => {
    it('returns true when calling with itself as argument', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.__create({ foo: 'bar' });
      const equals = instance.equals(instance);
      expect(equals).toBe(true);
    });

    it('returns true when calling with another instance of the same record', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance1 = Model.__create({ foo: 'bar' });
      const instance2 = Model.__findOne();
      const equals = instance1.equals(instance2);
      expect(equals).toBe(true);
    });

    it('returns false when calling with an instance of a different record', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance1 = Model.__create({ foo: 'bar' });
      const instance2 = Model.__create({ foo: 'bar' });
      const equals = instance1.equals(instance2);
      expect(equals).toBe(false);
    });
  });

  describe('.destroy()', () => {
    it('removes the instance data', async () => {
      const Model = ModelMock({ id: { primaryKey: true, type: STRING  } });
      const instance = Model.__create({ id: 1 });
      await instance.destroy();

      const deleted = Model.__findByPk(1);
      expect(deleted).toBe(null);
    });
  });

  describe('.update()', () => {
    it('updates the provided record fields and persists the instance', async () => {
      const Model = ModelMock({ foo: { type: STRING }, bar: { type: STRING } });
      const instance = Model.__create({ foo: 'baz' });
      await instance.update({ bar: 'qux' });

      const updated = Model.__findOne();
      expect(updated.get()).toEqual({ foo: 'baz', bar: 'qux' });
    });
  });

  describe('.reload()', () => {
    it('restores the field values of the instance to its persisted record values', async () => {
      const Model = ModelMock({ foo: { type: STRING }, bar: { type: STRING } });
      const instance = Model.__create({ foo: 'baz' });
      instance.bar = 'qux';

      await instance.reload();
      expect(instance.get()).toEqual({ foo: 'baz', bar: null });
    });
  });

  describe('.save()', () => {
    it('persists instances', async () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.build({ foo: 'bar' });
      await instance.save();

      const persisted = Model.__findOne();
      expect(persisted).toBeTruthy();
      expect(persisted.get()).toEqual({ foo: 'bar' });
    });

    it('persists existent instances', async () => {
      const Model = ModelMock({ foo: { type: STRING } });
      Model.__create({ foo: 'bar' });

      const instance = Model.__findOne();
      instance.foo = 'baz';
      await instance.save();

      const persisted = Model.__findOne({ where: { foo: 'baz' } });
      expect(persisted).toBeTruthy();
      expect(persisted.get()).toEqual({ foo: 'baz' });
    });

    it('persists instances with an "autoIncrement" primary key', async () => {
      const Model = ModelMock({ id: { primaryKey: true, autoIncrement: true, type: NUMBER } });
      const instance = Model.build();
      await instance.save();
      expect(instance).toHaveProperty('id', 1);
    });

    it('persists instances with a custom value for an "autoIncrement" field', async () => {
      const Model = ModelMock({ id: { primaryKey: true, autoIncrement: true, type: NUMBER } });
      const instance = Model.build({ id: 2 });
      await instance.save();
      expect(instance).toHaveProperty('id', 2);
      expect(Model.__create().id).toBe(3);
    });

    it('persists instances with an unset "defaultValue" field', async () => {
      const Model = ModelMock({ foo: { defaultValue: 'bar', type: STRING } });
      const instance = Model.build();
      await instance.save();
      expect(instance).toHaveProperty('foo', 'bar');
    });

    it('persists instances with an unset "defaultValue" DATE field', async () => {
      const Model = ModelMock(({ DATE, NOW }) => ({ definition: { foo: { defaultValue: NOW, type: DATE } } }));
      const instance = Model.build();
      await instance.save();
      expect(instance).toHaveProperty('foo', expect.any(Date));
    });

    it('persists instances with a changed "unique" field', async () => {
      const Model = ModelMock({ foo: { unique: true, type: STRING } });
      const instance = Model.__create({ foo: 'bar' });
      instance.foo = 'baz';
      await instance.save();
    });

    it('persists instances with an unchanged "unique" field', async () => {
      const Model = ModelMock({ foo: { unique: true, type: STRING } });
      const instance = Model.__create({ foo: 'bar' });
      await instance.save();
    });

    it('persists instances with an unchanged excluded field', async () => {
      const Model = ModelMock({ foo: { type: STRING }, baz: { type: STRING } });
      Model.__create({ foo: 'bar', baz: 'qux' });
      const instance = Model.__findOne({ attributes: ['foo'] });
      instance.foo = 'quux';
      await instance.save();

      const updated = Model.__findOne().get();
      expect(updated).toEqual({ foo: 'quux', baz: 'qux' });
    });

    it('does not persist an instances with an "allowNull" field set to null', async () => {
      const Model = ModelMock({ foo: { allowNull: false, type: STRING } });
      const instance = Model.build();
      await expect(instance.save).rejects.toThrow();
    });

    it('does not persist an instances with a "unique" field having a duplicate value', async () => {
      const Model = ModelMock({ foo: { unique: true, type: STRING } });
      Model.__create({ foo: 'bar' });
      const instance = Model.build({ foo: 'bar' });
      await expect(instance.save).rejects.toThrow();
    });

    it('does not persist an instances with a duplicate primary key', async () => {
      const Model = ModelMock({ id: { primaryKey: true, type: STRING } });
      Model.__create({ id: 'foo' });
      const instance = Model.build({ id: 'foo' });
      await expect(instance.save).rejects.toThrow();
    });

    it('does not persist an instances with a missing primary key', async () => {
      const Model = ModelMock({ id: { primaryKey: true, type: STRING } });
      const instance = Model.build();
      await expect(instance.save).rejects.toThrow();
    });
  });

  describe('.toJSON()', () => {
    it('returns a copy of all data values', () => {
      const Model = ModelMock({ foo: { type: STRING }, bar: { type: NUMBER } });
      const instance = Model.build({ foo: 'bar', baz: 123 });

      const data = instance.toJSON();
      expect(data).toEqual(instance.dataValues);

      data.foo = 'qux';
      data.baz = 456;
      expect(data).not.toEqual(instance.dataValues);
    });
  });

  describe('.FIELD', () => {
    it('gets the value of the specified field', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.build({ foo: 'bar' });

      expect(instance.foo).toBe('bar');
      expect(instance.get).toHaveBeenCalledWith('foo');
    });

    it('sets the value of the specified field', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.build({ foo: 'bar' });

      instance.foo = 'baz';
      expect(instance.foo).toBe('baz');
      expect(instance.get('foo')).toBe('baz');
      expect(instance.set).toHaveBeenCalledWith('foo', 'baz');
    });

    it('does not set the value of non-existent fields', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      const instance = Model.build({ foo: 'bar' });

      instance.baz = 'qux';
      expect(instance.dataValues.baz).not.toBe('qux');
    });
  });

  describe('.dataValues', () => {
    it('returns all instance data', () => {
      const Model = ModelMock({ foo: { type: STRING }, bar: { type: STRING } });
      const instance = Model.build({ bar: 'baz'});

      expect(instance.dataValues).toEqual({ foo: null, bar: 'baz' });
      instance.bar = 'qux';
      expect(instance.dataValues).toEqual({ foo: null, bar: 'qux' });
    });
  });

  describe('._previousDataValues', () => {
    it('returns the last persisted state of the instance record data', () => {
      const Model = ModelMock({ foo: { type: STRING }, bar: { type: STRING } });
      const instance = Model.__create({ bar: 'baz'});

      expect(instance._previousDataValues).toEqual({ foo: null, bar: 'baz' });
      instance.bar = 'qux';
      expect(instance._previousDataValues).toEqual({ foo: null, bar: 'baz' });
      instance.__save();
      expect(instance._previousDataValues).toEqual({ foo: null, bar: 'qux' });
    });
  });
});
