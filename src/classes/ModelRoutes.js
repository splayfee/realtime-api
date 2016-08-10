'use strict';

/**
 * Imports
 */
const _ = require('lodash');
const express = require('express');
const ModelMediator = require('./ModelMediator');
const Errors = require('../classes/Errors');
const validateJSON = require('../middleware/validateJSON');
const STATUS = require('../enums/http_status');


/**
 * This class defines all default end points for the specified entity.
 * @class
 */
class ModelRoutes {
  /**
   * Constructor for ModelMediator
   * @constructor
   * @param {String} modelName The model name.
   * @param {String} routePath The base route path.
   * @param {Object} io The socket server.
   * @param {Boolean} [concurrencyProtection] Flag that limits updates to require latest timestamp.
   * @param {Object} [include] Optional include object used to include related data.
   * @param {Object} [router] Optional router otherwise a new one is created.
   */
  constructor(modelName, routePath, io, concurrencyProtection, include, router) {
    if (concurrencyProtection instanceof Object) {
      include = concurrencyProtection;
      concurrencyProtection = false;
    }
    concurrencyProtection = concurrencyProtection || false;

    /**
     * Require the model name.
     */
    if (!modelName || modelName.length === 0) {
      throw Errors.getMissingModelNameError(modelName);
    }

    /**
     * Middleware containers. Any middleware functions added to these
     * arrays will be injected into the appropriate end point.
     */
    this.globalMiddleware = []; // Applied to all end points.
    this.getMiddleware = []; // Applied to get end points only.
    this.changeMiddleware = []; // Applied to create and update end points.
    this.deleteMiddleware = []; // Applied to delete end points only.
    this.batchMiddleware = []; // Applied to specific end point.
    this.getAllMiddleware = []; // Applied to specific end point.
    this.getOneMiddleware = []; // Applied to specific end point.
    this.createOneMiddleware = []; // Applied to specific end point.
    this.updateOneMiddleware = []; // Applied to specific end point.
    this.deleteOneMiddleware = []; // Applied to specific end point.
    this.deleteAllMiddleware = []; // Applied to specific end point.

    /**
     * Internal middleware methods used to process the
     * middleware arrays.
     */
    this._globalMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'globalMiddleware');
    };
    this._getMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'getMiddleware');
    };
    this._changeMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'changeMiddleware');
    };
    this._deleteMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'deleteMiddleware');
    };
    this._batchMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'batchMiddleware');
    };
    this._getAllMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'getAllMiddleware');
    };
    this._getOneMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'getOneMiddleware');
    };
    this._createOneMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'createOneMiddleware');
    };
    this._updateOneMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'updateOneMiddleware');
    };
    this._deleteOneMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'deleteOneMiddleware');
    };
    this._deleteAllMiddleware = (req, res, next) => {
      this._callMiddleware(req, res, next, 'deleteAllMiddleware');
    };

    /**
     * The model name.
     * @type {String}
     */
    this.modelName = modelName;

    /**
     * The base route path.
     * @type {String}
     */
    this.routePath = routePath;

    /**
     * Flag that limits updates to require latest timestamp.
     * @type {boolean}
     */
    this.concurrencyProtection = concurrencyProtection;

    /**
     * Optional include object used to include related data.
     * @type {Object}
     */
    this.include = include;

    this.io = io;

    /**
     * Instantiate the mediator.
     * @type {ModelMediator}
     */
    this.mediator = new ModelMediator(this.modelName, this.concurrencyProtection);

    /**
     * Instantiate a new router.
     */
    this.router = router || express.Router();
    this.createRoutes();
  }


  /**
   * Handles successful REST creation.
   * @param {Object} res The Express response instance.
   * @param {Object} results Specific results returned to the caller.
   */
  static handleCreateSuccess(res, results) {
    res.status(STATUS.CREATED).send(results);
  }

  /**
   * Handles successful REST operation: GET, PUT, PATCH, DELETE.
   * @param {Object} res The Express response instance.
   * @param {Object} [results] Optional results returned to the caller, if none send NO_CONTENT.
   */
  static handleSuccess(res, results) {
    if (results) {
      res.status(STATUS.OK).send(results);
    } else {
      res.status(STATUS.NO_CONTENT).send();
    }
  }

  /**
   * Handles failed REST operation.
   * @param {Object} res The Express response instance.
   * @param {ApplicationError} error An ApplicationError instance.
   */
  static handleError(res, error) {
    if (error.name.match(/^Application.*/g)) {
      console.error(error.message);
    } else {
      console.error(error.stack);
    }
    const formattedError = Errors.formatError(error);
    const status = formattedError.status || STATUS.INTERNAL_SERVER_ERROR;
    res.status(status).send(formattedError);
  }

  /**
   * Recursively calls middleware for specific array types.
   * @param {Object} req The HTTP request object.
   * @param {Object} res The HTTP response object.
   * @param {Function} next Callback function, called once a middleware completes successfully.
   * @param {String} middlewareType The name of the array to process.
   * @private
   */
  _callMiddleware(req, res, next, middlewareType) {
    const self = this;
    let counter = 0;
    const length = this[middlewareType].length;

    function callNext() {
      const nextMiddleware = self[middlewareType][counter];
      if (counter < length) {
        counter++;
        nextMiddleware(req, res, callNext);
      } else {
        next();
      }
    }
    callNext();
  }


  /**
   * Creates all common routes for the entity.
   */
  createRoutes() {
    // CREATE ONE
    this.router.post(
      `/${this.routePath}`,
      this._globalMiddleware,
      this._changeMiddleware,
      this._createOneMiddleware,
      validateJSON,
      (req, res) => {
        // Add path parameters to the body
        _.merge(req.body, req.params);
        this.mediator.createOne(req.body)
          .then(
            results => {
              ModelRoutes.handleCreateSuccess(res, results);
              const item = _.merge(req.body, results);
              this.io.emit('CREATE', { type: this.modelName, item });
            },
            error => ModelRoutes.handleError(res, error)
          );
      });

    // BATCH CREATE, UPDATE, DELETE
    this.router.patch(
      `/${this.routePath}`,
      this._globalMiddleware,
      this._batchMiddleware,
      validateJSON, (req, res) => {
        this.mediator.batchCreateUpdateDelete(req.body, req.params)
          .then(
            results => ModelRoutes.handleSuccess(res, results),
            error => ModelRoutes.handleError(res, error)
          );
      });

    // GET ALL
    this.router.get(
      `/${this.routePath}`,
      this._globalMiddleware,
      this._getMiddleware,
      this._getAllMiddleware,
      (req, res) => {
        // Combine the query and the params as one.
        const queryAndParams = _.merge(req.query, req.params);
        this.mediator.getAll(queryAndParams, this.include)
          .then(
            results => ModelRoutes.handleSuccess(res, results),
            error => ModelRoutes.handleError(res, error)
          );
      });

    // GET ONE
    this.router.get(
      `/${this.routePath}/:id`,
      this._globalMiddleware,
      this._getMiddleware,
      this._getOneMiddleware,
      (req, res) => {
        // Combine the query and the params as one.
        const queryAndParams = _.merge(req.query, req.params);
        this.mediator.getOne(queryAndParams, this.include)
          .then(
            results => ModelRoutes.handleSuccess(res, results),
            error => ModelRoutes.handleError(res, error)
          );
      });

    // UPDATE ONE
    this.router.put(
      `/${this.routePath}/:id`,
      this._globalMiddleware,
      this._changeMiddleware,
      this._updateOneMiddleware,
      validateJSON,
      (req, res) => {
        // Add path parameters to the body.
        _.merge(req.body, req.params);
        this.mediator.updateOne(req.body, req.params)
          .then(
            results => {
              ModelRoutes.handleSuccess(res, results);
              const item = _.merge(req.body, results);
              this.io.emit('UPDATE', { type: this.modelName, item });
            },
            error => ModelRoutes.handleError(res, error)
          );
      });

    // UPDATE MANY
    this.router.put(
      `/${this.routePath}`,
      this._globalMiddleware,
      this._changeMiddleware,
      this._createOneMiddleware,
      validateJSON,
      (req, res) => {
        // Add path parameters to the body
        _.merge(req.body, req.params);
        const queryAndParams = _.merge(req.query, req.params);
        this.mediator.updateMany(req.body, queryAndParams)
          .then(
            results => {
              ModelRoutes.handleSuccess(res, results);
              this.io.emit('UPDATE-MANY', { type: this.modelName, item: results });
            },
            error => ModelRoutes.handleError(res, error)
          );
      });

    // DELETE ONE
    this.router.delete(
      `/${this.routePath}/:id`,
      this._globalMiddleware,
      this._deleteMiddleware,
      this._deleteOneMiddleware,
      validateJSON,
      (req, res) => {
        // Combine the query and the params as one.
        const queryAndParams = _.merge(req.query, req.params);
        this.mediator.deleteOne(queryAndParams)
          .then(
            results => {
              ModelRoutes.handleSuccess(res, results);
              this.io.emit('DELETE', { type: this.modelName, item: queryAndParams });
            },
            error => ModelRoutes.handleError(res, error)
          );
      });

    // DELETE ALL
    this.router.delete(
      `/${this.routePath}`,
      this._globalMiddleware,
      this._deleteMiddleware,
      this._deleteAllMiddleware,
      validateJSON,
      (req, res) => {
        // Combine the query and the params as one.
        const queryAndParams = _.merge(req.query, req.params);
        this.mediator.deleteAll(queryAndParams)
          .then(
            () => {
              ModelRoutes.handleSuccess(res);
              this.io.emit('DELETE-ALL', { type: this.modelName });
            },
            error => ModelRoutes.handleError(res, error)
          );
      });
  }
}

module.exports = ModelRoutes;
