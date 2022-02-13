module.exports = ({ name }, { exists, template, addToRoot }) => {
  if (!/^[A-Z][A-z0-9]*$/.test(name)) {
    throw new Error(`Invalid name "${name}"`);
  }
  const basePath = 'src/infrastructure/models';
  const filename = `${name}.js`;
  const destination = `${basePath}/${filename}`;
  if (exists(destination)) {
    throw new Error(`Model "${filename}" already exists`);
  }

  template('db:model.js', destination, { name });
  addToRoot('Model', name, './infrastructure/models');

  console.log(`Model created at "${destination}"`);
};
