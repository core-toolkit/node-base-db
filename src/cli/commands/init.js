const supportedDialects = ['postgres'];

module.exports = ({ dialect }, { addToConfig, addBasePackage, addAppToRoot }) => {
  if (!supportedDialects.includes(dialect)) {
    throw new Error(`Unsupported dialect ${dialect}, must be one of: [${supportedDialects.join(', ')}]`);
  }

  addToConfig('db:config.js', { dialect, dialectUpper: dialect.toUpperCase() });
  addBasePackage(`node-base-db-${dialect}`);
  addAppToRoot('Db');
};
