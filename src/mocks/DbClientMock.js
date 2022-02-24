module.exports = () => {
  const _transactions = [];

  const transaction = jest.fn(async (fn) => {
    const t = {
      commit: jest.fn(async () => { }),
      rollback: jest.fn(async () => { }),
    };
    _transactions.push(t);

    if (!fn) {
      return t;
    }
    try {
      const ret = await fn(t);
      await t.commit();
      return ret;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  });

  const mockClear = () => {
    _transactions.forEach((t) => {
      t.commit.mockClear();
      t.rollback.mockClear();
    });
    transaction.mockClear();
  }

  const mockReset = () => {
    _transactions.splice(0, _transactions.length);
    mockClear();
  };

  return {
    _transactions,
    mockClear,
    mockReset,
    transaction,
  }
};
