const supportedDialects = ['postgres'];

module.exports = ({ dialect }, { addToConfig, addPackage }) => {
  if (!supportedDialects.includes(dialect)) {
    throw new Error(`Unsupported dialect ${dialect}, must be one of: [${supportedDialects.join(', ')}]`);
  }

  addToConfig('db:config.js', { dialect });
  addPackage(`node-base-db-${dialect}`);
};
