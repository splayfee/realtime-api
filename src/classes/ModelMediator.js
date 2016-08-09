'use strict';

/**
 * REQUIRED IMPORTS
 */
const Promise = require('bluebird');
const _ = require('lodash');
const models = require('../models');
const Errors = require('../classes/Errors');

/**
 * Enum for error types.
 */
const PARAMETERS = {
  FIELDS: 'fields',
  SORT: 'sort',
  LIMIT: 'limit',
  OFFSET: 'offset'
};

/**
 * Validates that a single field exists.
 * @param {String} modelName The name of the entity used to select the proper Sequelize model.
 * @param {String} fieldName The name of the field to check.
 * @returns {null|Error}
 */
function _checkThatSpecificFieldExists(modelName, fieldName) {
  let error = null;
  if (!models[modelName].rawAttributes[fieldName]) {
    error = Errors.getMissingFieldError({ modelName, fieldName });
  }
  return error;
}

/**
 * Validates that every field exists.
 * @param {String} modelName The name of the entity used to select the proper Sequelize model.
 * @param {Array} fieldNames A collection of field names to test.
 * @returns {Array}
 */
function _checkThatAllFieldsExist(modelName, fieldNames) {
  const errors = [];
  _.each(fieldNames, (fieldName) => {
    const error = _checkThatSpecificFieldExists(modelName, fieldName);
    if (error) {
      errors.push(error);
    }
  });
  return errors;
}

/**
 * This method parses and creates options based on the query string received from the caller.
 * All parameters are case insensitive. Wherever possible, it will perform error checking and
 * provide an array of errors (if any).
 * @param {Object} query Query parameters received from the caller.
 * @param {String} modelName The name of the entity used to select the proper Sequelize model.
 * @returns {{options: Object, errors: Array}}
 */
function _parseQuery(query, modelName) {
  const options = {};
  let errors = [];

  // If there are no query parameters then parsing is unnecessary.
  if (!query) {
    return { options, errors };
  }

  const keys = Object.keys(query);
  _.each(keys, (key) => {
    switch (key.toLowerCase()) {

      // Caller can limit the fields returned; provide one or more field names comma-separated.
      case PARAMETERS.FIELDS: {
        const fields = query.fields.split(',');
        const includeAttributes = [];
        const excludeAttributes = [];
        _.each(fields, (field) => {
          if (field.substr(0, 1) !== '-') {
            includeAttributes.push(field);
          }
          else {
            excludeAttributes.push(field.substr(1));
          }
        });

        if (includeAttributes.length > 0) {
          errors = errors.concat(_checkThatAllFieldsExist(modelName, includeAttributes));
          options.attributes = includeAttributes;
        }
        else {
          errors = errors.concat(_checkThatAllFieldsExist(modelName, excludeAttributes));
          options.attributes = {
            exclude: excludeAttributes
          };
        }

        if (includeAttributes.length > 0 && excludeAttributes.length > 0) {
          errors.push(Errors.getFieldIncludeExcludeError());
        }
        delete query[key];
        break;
      }

      /**
       * Caller can sort the results; provide one or more
       * field names comma-separated, prefix - for descending.
      */
      case PARAMETERS.SORT: {
        options.order = [];
        const sortItems = query.sort.split(',');
        _.each(sortItems, (sortItem) => {
          if (sortItem.substr(0, 1) === '-' || sortItem.substr(0, 1) === '+') {
            if (sortItem.substr(0, 1) === '-') {
              const error = _checkThatSpecificFieldExists(modelName, sortItem.substr(1));
              if (error) {
                errors.push(error);
              }
              else {
                options.order.push([sortItem.substr(1), 'DESC']);
              }
            }
          }
          else {
            const error = _checkThatSpecificFieldExists(modelName, sortItem);
            if (error) {
              errors.push(error);
            }
            else {
              options.order.push([sortItem]);
            }
          }
        });
        delete query[key];
        break;
      }

      // Caller may limit the number of results; used in pagination.
      case PARAMETERS.LIMIT: {
        const limit = Number(query[key]);
        if (Number.isInteger(limit) && limit > 0) {
          options.limit = limit;
        }
        else {
          errors.push(Errors.getLimitError());
        }
        delete query[key];
        break;
      }

      // Caller may offset the results; used in pagination.
      case PARAMETERS.OFFSET: {
        const offset = Number(query[key]);
        if (Number.isInteger(offset) && offset >= 0) {
          options.offset = offset;
        }
        else {
          errors.push(Errors.getOffsetError());
        }
        delete query[key];
        break;
      }

      // Caller may filter by existing fields; each field is validated to exist.
      default: {
        const error = _checkThatSpecificFieldExists(modelName, key);
        if (error) {
          errors.push(error);
        }
        break;
      }
    }
  });

  if (errors.length === 0) {
    options.where = query;
  }

  return { options, errors };
}


/**
 * This class mediates between the entities end point calls and the database's ORM facilities.
 * @class
 */
class ModelMediator {

  /**
   * Constructor for ModelMediator
   * @constructor
   * @param {String} modelName The model name.
   * @param {boolean} [concurrencyProtection] Flag that limits updates to require latest timestamp.
   */
  constructor(modelName, concurrencyProtection) {
    concurrencyProtection = concurrencyProtection || false;

    /**
     * Require the model name.
     */
    if (!modelName || modelName.length === 0 || !models[modelName]) {
      throw Errors.getMissingModelNameError(modelName);
    }

    /**
     * The model name.
     */
    this.modelName = modelName;

    /**
     * Flag that limits updates to require latest timestamp.
     * @type {boolean}
     */
    this.concurrencyProtection = concurrencyProtection;
  }

  /**
   * Creates an item in the database.
   * @param {Object} item An item instance sent from the client (in JSON format).
   * @param {Object} [transaction] An optional Sequelize transaction instance.
   * @returns {Object} Additional information added by the ORM facilities upon success.
   */
  createOne(item, transaction) {
    return new Promise(
      (resolve, reject) => {
        const errors = _checkThatAllFieldsExist(this.modelName, Object.keys(item));
        if (errors && errors.length > 0) {
          const applicationError = Errors.getErrorCollection(errors);
          reject(applicationError);
        }
        else {
          delete item.id;
          delete item.created_at;
          delete item.updated_at;
          models[this.modelName].create(item, { transaction })
            .then(
              result => resolve(_.pick(result, ['id', 'created_at', 'updated_at'])),
              error => reject(error)
            );
        }
      }
    );
  }

  /**
   * Creates, updates, and deletes one or more items in
   * the database. This operation is transactional.
   * @param {Object} items An object containing three arrays,
   * createRequests, updateRequests, and deleteRequests.
   * @param {Object} params An object that holds all path parameters.
   * @returns {Array} Additional information added by the ORM facilities upon success.
   */
  batchCreateUpdateDelete(items, params) {
    const errors = [];
    let createErrors = [];
    let updateErrors = [];
    let deleteErrors = [];
    let errorCount = 0;

    return new Promise(
      (resolve, reject) => {
        const acceptedProperties = ['createItems', 'updateItems', 'deleteItems'];
        _.each(Object.keys(items), (key) => {
          if (acceptedProperties.indexOf(key) < 0) {
            errors.push(Errors.getInvalidPropertyError(key));
          }
        });

        if (errors.length > 0) {
          reject(Errors.getErrorCollection(errors));
          return;
        }

        const createItems = items.createItems;
        const updateItems = items.updateItems;
        const deleteItems = items.deleteItems;
        _.each(createItems, (item) => {
          createErrors = createErrors.concat(
            _checkThatAllFieldsExist(this.modelName, Object.keys(item)));
        });
        _.each(updateItems, (item) => {
          updateErrors = updateErrors.concat(
            _checkThatAllFieldsExist(this.modelName, Object.keys(item)));
        });
        _.each(deleteItems, (item) => {
          deleteErrors = deleteErrors.concat(
            _checkThatAllFieldsExist(this.modelName, Object.keys(item)));
        });
        errorCount = errors.length + createErrors.length + updateErrors.length + deleteErrors.length;
        if (errorCount > 0) {
          reject(Errors.getBatchError(errors, createErrors, updateErrors, deleteErrors));
        }
        else {
          const promises = [];
          const createResults = [];
          const updateResults = [];
          const deleteResults = [];

          models.sequelize.transaction().then(
            (transaction) => {
              // PERFORM ALL CREATE OPERATIONS.
              if (createItems && createItems.length > 0) {
                const createPromise = Promise.map(createItems, (createItem) => {
                  // Combine the body and the params as one.
                  _.merge(createItem, params);
                  return this.createOne(createItem, transaction)
                    .then(
                      result => createResults.push(result),
                      errors1 => { createErrors = createErrors.concat(errors1); }
                    );
                });
                promises.push(createPromise);
              }

              // PERFORM ALL UPDATE OPERATIONS.
              if (updateItems && updateItems.length > 0) {
                const updatePromise = Promise.map(updateItems, (updateItem) => {
                  const queryAndParams = _.clone(params);
                  queryAndParams.id = updateItem.id;
                  return this.updateOne(updateItem, queryAndParams, transaction)
                    .then(
                      result => updateResults.push(result),
                      errors2 => { updateErrors = updateErrors.concat(errors2); }
                    );
                });
                promises.push(updatePromise);
              }

              // PERFORM ALL DELETE OPERATIONS.
              if (deleteItems && deleteItems.length > 0) {
                const deletePromise = Promise.map(deleteItems, (deleteItem) => {
                  const queryAndParams = _.clone(params);
                  queryAndParams.id = deleteItem.id;
                  return this.deleteOne(queryAndParams, transaction)
                    .then(
                      result => deleteResults.push(result),
                      errors3 => { deleteErrors = deleteErrors.concat(errors3); }
                    );
                });
                promises.push(deletePromise);
              }

              Promise.all(promises).then(
                () => {
                  errorCount = errors.length + createErrors.length + updateErrors.length + deleteErrors.length;
                  if (errorCount === 0) {
                    resolve({ createResults, updateResults, deleteResults });
                    return transaction.commit();
                  }
                  reject(Errors.getBatchError(createErrors, updateErrors, deleteErrors));
                  return transaction.rollback();
                }
              );
            },
            error => reject(error)
          );
        }
      }
    );
  }

  /**
   * Get a single item instance using the primary key and return it to the client.
   * @param {Object} queryAndParams An object that combines both query and params.
   * @param {object} [include] Optional inclusion for this object.
   * @param {boolean} [raw] Optional value when present returns the raw object.
   * string parameters and all path parameters.
   */
  getOne(queryAndParams, include, raw) {
    return new Promise(
      (resolve, reject) => {
        models[this.modelName].find({ where: queryAndParams, include, raw })
          .then(
            result => {
              if (result) {
                resolve(result);
              }
              else {
                reject(Errors.getItemNotFoundError(queryAndParams.id, this.modelName));
              }
            },
            error => reject(error)
          );
      }
    );
  }

  /**
   * Get all item instances; allow field selection, sorting, and pagination.
   * @param {Object} queryAndParams An object that combines both query and params.
   * @param {object} [include] Optional inclusion for this object.
   * @param {boolean} [raw] Optional value when present returns the raw object.
   * string parameters and all path parameters.
   */
  getAll(queryAndParams, include, raw) {
    const optionInfo = _parseQuery(queryAndParams, this.modelName);
    return new Promise(
      (resolve, reject) => {
        if (optionInfo.errors.length === 0) {
          optionInfo.options.include = include;
          optionInfo.options.raw = raw;
          models[this.modelName].findAll(optionInfo.options)
            .then(
              result => resolve(result),
              error => reject(error)
            );
        }
        else {
          reject(Errors.getErrorCollection(optionInfo.errors));
        }
      }
    );
  }

  /**
   * Updates an item in the database.
   * @param {Object} item An item instance sent from the client (in JSON format).
   * @param {Object} params An object that holds all path parameters.
   * @param {Object} [transaction] An optional Sequelize transaction instance.
   * @returns {Object} Additional information added by the ORM facilities upon success.
   */
  updateOne(item, params, transaction) {
    return new Promise(
      (resolve, reject) => {
        models[this.modelName].find({ where: params })
          .then(
            foundItem => {
              if (!foundItem) {
                reject(Errors.getItemNotFoundError(params.id, this.modelName));
              }
              else if (this.concurrencyProtection && foundItem.dataValues.updated_at > new Date(item.updated_at)) {
                reject(Errors.getConcurrencyError(foundItem));
              }
              else {
                const keys = Object.keys(params);
                _.each(keys, (key) => {
                  delete item[key];
                });
                delete item.created_at;
                delete item.updated_at;
                models[this.modelName].update(item, { where: params, transaction })
                  .then(
                    (itemUpdatedCount) => {
                      if (itemUpdatedCount[0] > 0) {
                        models[this.modelName].find({ where: params })
                          .then(
                            (updatedItem) => {
                              resolve(_.pick(updatedItem, ['id', 'updated_at']));
                            },
                            error => reject(error)
                          );
                      }
                      else {
                        reject(Errors.getItemNotFoundError(params.id, this.modelName));
                      }
                    },
                    error => reject(error)
                  );
              }
            },
            error => reject(error)
          );
      }
    );
  }

  /**
   * Updates an item in the database.
   * @param {Object} item An item instance sent from the client (in JSON format).
   * @param {Object} params An object that holds all path parameters.
   * @returns {Object} Additional information added by the ORM facilities upon success.
   */
  updateMany(item, params) {
    return new Promise(
      (resolve, reject) => {
        delete item.id;
        delete item.created_at;
        delete item.updated_at;
        models[this.modelName].update(item, { where: params })
          .spread(
            (affectedCount) => {
              resolve({ affectedCount });
            }
          ).catch(error => reject(error));
      }
    );
  }

  /**
   * Delete a single item instance using the primary key.
   * @param {Object} queryAndParams An object that combines both query and params.
   * string parameters and all path parameters.
   * @param {Object} [transaction] An optional Sequelize transaction instance.
   */
  deleteOne(queryAndParams, transaction) {
    return new Promise(
      (resolve, reject) => {
        models[this.modelName].destroy({ where: queryAndParams, transaction })
          .then(
            (result) => {
              if (result > 0) {
                resolve({ id: queryAndParams.id });
              }
              else {
                reject(Errors.getItemNotFoundError(queryAndParams.id, this.modelName));
              }
            },
            error => reject(error)
          );
      }
    );
  }

  /**
   * Deletes all item instances.
   * @param {Object} queryAndParams An object that combines both query and params.
   * @param {Object} [transaction] An optional Sequelize transaction instance.
   */
  deleteAll(queryAndParams, transaction) {
    const optionInfo = _parseQuery(queryAndParams, this.modelName);
    return new Promise(
      (resolve, reject) => {
        if (optionInfo.errors.length === 0) {
          models[this.modelName].destroy({ where: queryAndParams, transaction })
            .then(
              result => resolve(result),
              error => reject(error)
            );
        }
        else {
          reject(Errors.getErrorCollection(optionInfo.errors));
        }
      }
    );
  }
}

module.exports = ModelMediator;
