'use strict';

const config = require('../config');
const ModelRoutes = require('../classes/ModelRoutes');
const verifyToken = require('../middleware/verifyToken');
const hashPassword = require('../middleware/hashPassword');

const defaultRoutes = new Map();


/**
 * Adds a default route to the default routes map.
 * @param {Object} app The Express application instance.
 * @param {String} modelName An model name used with this route.
 * @param {String} routePath The route path used by the caller.
 * @param {Object} io The socket server.
 * @param {Boolean} [concurrencyProtection] Flag that limits updates to require latest timestamp.
 * @param {Object} [include] Optional include object used to include related data.
 * @returns {ModelRoutes} A ModelRoutes instance.
 */
function addDefaultRoutes(app, modelName, routePath, io, concurrencyProtection, include) {
  const modelRoutes = new ModelRoutes(modelName, routePath, io, concurrencyProtection, include);
  defaultRoutes.set(routePath, modelRoutes);
  modelRoutes.globalMiddleware = [verifyToken];
  app.use(config.API_BASE, modelRoutes.router);
  return modelRoutes;
}


/**
 * Instantiate default routes for each model; generated based on Sequelize models.
 * @param {Object} app The Express application instance.
 * @returns {Map} A map of ModelRoute instances.
 */
module.exports = (app, io) => {
  addDefaultRoutes(app, 'task', 'tasks', io, true);
  const userRoutes = addDefaultRoutes(app, 'user', 'users', io, true);
  userRoutes.changeMiddleware = [hashPassword];

  return defaultRoutes;
};
