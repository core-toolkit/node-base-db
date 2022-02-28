const Sequelize = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const { resolve } = require('path');

const CreateMigration = require('../cli/commands/create-migration');

module.exports = ({ Core: { Cli, Project }, Client: { DbClient }, Log }) => {
  const umzug = new Umzug({
    migrations: {
      glob: resolve(Project.path, 'src/infrastructure/migrations/*.js'),
    },
    context: {
      Sequelize,
      query: DbClient.getQueryInterface(),
    },
    storage: new SequelizeStorage({ sequelize: DbClient }),
    logger: Log,
  });

  Cli.register([
    {
      name: 'migration:create',
      args: ['name'],
      description: 'Creates a new migration',
      exec: CreateMigration,
    },
    {
      name: 'migration:up',
      description: 'Execute all pending migrations',
      exec: () => umzug.up(),
    },
    {
      name: 'migration:down',
      description: 'Revert the last migration',
      exec: () => umzug.down(),
    },
    {
      name: 'migration:test',
      description: 'Tests the consistency of the last migration (up, down, up)',
      exec: async () => {
        await umzug.up();
        await umzug.down();
        await umzug.up();
      },
    },
  ], true);

  return umzug;
};
