const { DataTypes } = require('sequelize');
const ModelFactory = require('./Model');

const sequelize = {
  define: jest.fn((name) => name),
  get models() {
    return sequelize.define.mock.results.reduce((out, { value }) => ({ ...out, [value]: value }), {});
  },
};

describe('Model', () => {
  beforeEach(() => sequelize.define.mockClear());

  it('creates models', () => {
    const definition = {};
    const makeFn = jest.fn(() => ({ name: 'Test', definition }));

    const model = ModelFactory(makeFn, sequelize);
    expect(model).toBe('Test');
    expect(sequelize.define).toHaveBeenCalledWith('Test', definition, expect.objectContaining({ sequelize }));
    expect(makeFn).toHaveBeenCalledWith(DataTypes);
  });

  it('passes down options to sequelize', () => {
    const definition = {};
    const makeFn = () => ({ name: 'Test', definition, options: { foo: 'bar', baz: 123 } });

    ModelFactory(makeFn, sequelize);
    expect(sequelize.define).toHaveBeenCalledWith('Test', definition, expect.objectContaining({
      foo: 'bar',
      baz: 123,
    }));
  });

  it('resolves associated models', () => {
    const mock = jest.fn();
    const makeFn = () => ({
      name: 'Test1',
      definition: {},
      associations: {
        Test2: mock,
      },
    });

    ModelFactory(makeFn, sequelize);
    expect(mock).not.toHaveBeenCalled();

    ModelFactory(() => ({ name: 'Test2', definition: {} }), sequelize);
    expect(mock).toHaveBeenCalledWith('Test1', 'Test2');
  });

  it('does not create models with an invalid make function', () => {
    expect(() => ModelFactory('foo', sequelize)).toThrow();
    expect(sequelize.define).not.toHaveBeenCalled();
  });

  it('does not create models with missing or invalid names', () => {
    expect(() => ModelFactory(() => ({ definition: {} }), sequelize)).toThrow();
    expect(() => ModelFactory(() => ({ name: 123, definition: {} }), sequelize)).toThrow();
    expect(sequelize.define).not.toHaveBeenCalled();
  });

  it('does not create models with missing or invalid definitions', () => {
    expect(() => ModelFactory(() => ({ name: 'Test' }), sequelize)).toThrow();
    expect(() => ModelFactory(() => ({ name: 'Test', definition: 'foo' }), sequelize)).toThrow();
    expect(sequelize.define).not.toHaveBeenCalled();
  });

  it('does not create models with invalid options', () => {
    expect(() => ModelFactory(() => ({ name: 'Test', definition: {}, options: 'foo' }), sequelize)).toThrow();
    expect(sequelize.define).not.toHaveBeenCalled();
  });

  it('does not create models with invalid associations', () => {
    expect(() => ModelFactory(() => ({ name: 'Test', definition: {}, associations: 'foo' }), sequelize)).toThrow();
    expect(() => ModelFactory(() => ({
      name: 'Test',
      definition: {},
      associations: { Target: 'foo' },
    }), sequelize)).toThrow();
    expect(sequelize.define).not.toHaveBeenCalled();
  });
});
