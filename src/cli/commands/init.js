const supportedDialects = ['postgres'];

module.exports = async ({ dialect }, { addToConfig, addBasePackage, addAppToRoot }) => {
  if (!supportedDialects.includes(dialect)) {
    throw new Error(`Unsupported dialect ${dialect}, must be one of: [${supportedDialects.join(', ')}]`);
  }

  addToConfig('db:config.js', { dialect, dialectUpper: dialect.toUpperCase() });
  await addBasePackage(`db-${dialect}`);
  addAppToRoot('Db');
};
