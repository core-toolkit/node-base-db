module.exports = ({ name }, { template }) => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

  const date = new Date();
  const dateFormatted = ['FullYear', 'Month', 'Date', 'Hours', 'Minutes', 'Seconds']
    .map((method) => date[`getUTC${method}`]())
    .map((value, i) => (i === 1 ? String(value + 1).padStart(2, '0') : value))
    .join('');

  const destination = `src/infrastructure/migrations/${dateFormatted}-${slug}.js`;
  template('db:migration.js', destination, {});

  console.log(`New migration created at "${destination}"`);
};
