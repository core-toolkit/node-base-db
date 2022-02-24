const DbClientMock = require('./DbClientMock');

describe('DbClientMock', () => {
  it('creates a DB client mock', () => {
    const client = DbClientMock();
    expect(client).toBeInstanceOf(Object);
    expect(client).toHaveProperty('_transactions', expect.any(Array));
    expect(client).toHaveProperty('mockClear', expect.any(Function));
    expect(client).toHaveProperty('mockReset', expect.any(Function));
    expect(client).toHaveProperty('transaction', expect.any(Function));
  });

  describe('.transaction()', () => {
    it('creates transactions', async () => {
      const client = DbClientMock();

      const transaction = await client.transaction();
      expect(transaction).toBeInstanceOf(Object);
      expect(transaction).toHaveProperty('commit', expect.any(Function));
      expect(transaction).toHaveProperty('rollback', expect.any(Function));
      expect(client.transaction).toHaveBeenCalled();
      expect(client._transactions[0]).toBe(transaction);

      await transaction.commit();
      await transaction.rollback();
      expect(transaction.commit).toHaveBeenCalled();
      expect(transaction.rollback).toHaveBeenCalled();
    });

    it('creates and commits transactions with callbacks', async () => {
      const client = DbClientMock();
      const mock = jest.fn(async () => { return 'foo' });

      const ret = await client.transaction(mock);
      expect(ret).toBe('foo');
      expect(mock).toHaveBeenCalledWith(client._transactions[0]);
      expect(client._transactions[0].commit).toHaveBeenCalled();
      expect(client._transactions[0].rollback).not.toHaveBeenCalled();
    });

    it('creates and rollbacks failing transactions with callbacks', async () => {
      const client = DbClientMock();
      const mock = async () => { throw new Error('foo'); };

      await expect(client.transaction(mock)).rejects.toThrow('foo');
      expect(client._transactions[0].commit).not.toHaveBeenCalled();
      expect(client._transactions[0].rollback).toHaveBeenCalled();
    });
  });

  describe('.mockClear()', () => {
    it('clears all mocked functions', async () => {
      const client = DbClientMock();
      const transaction = await client.transaction();
      await transaction.commit();
      await transaction.rollback();

      client.mockClear();
      expect(client.transaction).not.toHaveBeenCalled();
      expect(client._transactions[0].commit).not.toHaveBeenCalled();
      expect(client._transactions[0].rollback).not.toHaveBeenCalled();
    });
  });

  describe('.mockReset()', () => {
    it('clears all mocked functions and clears any transactions', async () => {
      const client = DbClientMock();
      const transaction = await client.transaction();
      await transaction.commit();
      await transaction.rollback();

      client.mockReset();
      expect(client.transaction).not.toHaveBeenCalled();
      expect(client._transactions).toEqual([]);
    });
  });
});
