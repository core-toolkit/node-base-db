const { Op } = require('sequelize');
const ModelMock = require('./ModelMock');
const { STRING, NUMBER } = require('./DataTypesMock');

const makeModelWithDirtyMocks = async (seed = 0) => {
  const Model = ModelMock({ id: { primaryKey: true, autoIncrement: true, type: NUMBER } }, seed);
  Model.build();
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
  expect(Model).toHaveProperty('records', expect.any(Set));
  expect(Model).toHaveProperty('mockClear', expect.any(Function));
  expect(Model).toHaveProperty('mockReset', expect.any(Function));
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
    const Model = ModelMock((DataTypes) => ({ name: 'Test', definition: {
      foo: { type: DataTypes.STRING },
    }}));
    assertModelClass(Model);
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
      const record = Model.__query().next().value;
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

  describe('::records', () => {
    it('contains all record data', () => {
      const Model = ModelMock({ foo: { type: STRING } });
      expect(Model.records.size).toBe(0);

      Model.__create({ foo: 'bar' });
      expect(Model.records.size).toBe(1);

      const instance = Model.build({ foo: 'baz' });
      expect(Model.records.size).toBe(1);

      instance.__save();
      expect(Model.records.size).toBe(2);

      expect([...Model.records.values()]).toEqual([{ foo: 'bar' }, { foo: 'baz' }]);
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
      expect(row).toBe(instance.dataValues);
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
