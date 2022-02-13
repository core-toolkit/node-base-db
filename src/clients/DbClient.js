const { Sequelize } = require('sequelize');

module.exports = ({ Core: { Config: { db: { username, password, host, database, dialect } } } }) => new Sequelize({
  username,
  password,
  host,
  database,
  dialect,
});
