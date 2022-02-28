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

  app.afterInit(({ Core: { Cli } }) => Cli.register({
    name: 'create:model',
    args: ['name'],
    description: 'Create new model',
    exec: CreateModel,
  }, true));

  app.afterStart(({ Service }) => Service.MigrationService.up());

  app.beforeStop(({ Client }) => Client.DbClient.close());

  return app;
};
