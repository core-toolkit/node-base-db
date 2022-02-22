const CreateModel = require('./cli/commands/create-model');
const MakeDbClient = require('./clients/DbClient');
const MakeMigrator = require('./services/MigrationService');
const ModelFactory = require('./factories/Model');

module.exports = (app) => {
  app.register('Client', 'DbClient', MakeDbClient);
  app.register('Service', 'MigrationService', MakeMigrator);

  app.registerType('Model', 'Client');
  app.addTypeMiddleware('Model', (next, { Client }) => () => ModelFactory(next, Client.DbClient));

  app.appendTypeParameters('Service', 'Model');
  app.appendTypeParameters('UseCase', 'Model');

  const { start, initAll } = app;

  app.initAll = async () => {
    const { Core: { Cli } } = await app.resolveDependencies(['Core']);
    if (!Cli.list().includes('create:model')) {
      Cli.register({
        name: 'create:model',
        args: ['name'],
        description: 'Create new model',
        exec: CreateModel,
      });
    }

    return initAll();
  };

  app.start = async () => {
    await start();
    const { Service } = await app.resolveDependencies(['Service']);
    await Service.MigrationService.up();
  };

  return app;
};
