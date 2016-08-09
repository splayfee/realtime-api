'use strict';

const _ = require('lodash');
const STATUS = require('../enums/http_status');


/**
 * Enum for error types.
 */
const ERROR_TYPES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  COLLECTION: 'collection',
  DATABASE: 'database',
  FILES: 'files',
  SYSTEM: 'system',
  VALIDATION: 'validation'
};

const Errors = {};

/**
 * This class manages and defines all applications errors within the system.
 * @class
 */
class ApplicationError extends Error {

  /**
   * Constructor for ApplicationError
   * @constructor
   * @param {number} id A unique identifier for the error.
   * @param {string} type The type of error.
   * @param {string} name A name for the error.
   * @param {string} message A detailed message for the error.
   * @param {number} status A related HTTP status code.
   */
  constructor(id, type, name, message, status) {
    super(message);

    /**
     * A unique identifier for the error.
     */
    this.id = id;

    /**
     * The type of error.
     */
    this.type = type;

    /**
     * A unique identifier for the error.
     */
    this.name = `ApplicationError:${name}`;

    /**
     * Related HTTP status for this error.
     */
    this.status = status;
  }

  /* eslint-disable */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      message: this.message,
      errors: this.errors,
      info: this.info,
      updatedItem: this.updatedItem,
      createErrors: this.createErrors,
      updateErrors: this.updateErrors,
      deleteErrors: this.deleteErrors
    };
  }
  /* eslint-enable */
}

Errors.getSystemError = (error) => {
  return new ApplicationError(
    90000,
    ERROR_TYPES.SYSTEM,
    error.name,
    error.message,
    STATUS.INTERNAL_SERVER_ERROR
  );
};

Errors.getMissingModelNameError = (modelName) => {
  return new ApplicationError(
    90001,
    ERROR_TYPES.DATABASE,
    'MissingModelNameError',
    `Invalid model name '${modelName}'. You must provide an existing model name.`,
    STATUS.INTERNAL_SERVER_ERROR
  );
};

Errors.getMissingTokenError = () => {
  return new ApplicationError(
    90002,
    ERROR_TYPES.AUTHENTICATION,
    'MissingTokenError',
    'The JWT is missing. You must provide it in the header or as a POST body parameter.',
    STATUS.FORBIDDEN
  );
};

Errors.getInvalidTokenError = () => {
  return new ApplicationError(
    90003,
    ERROR_TYPES.AUTHENTICATION,
    'InvalidTokenError',
    'The JWT token is invalid. Please try again with a valid token.',
    STATUS.FORBIDDEN
  );
};

Errors.getExpiredTokenError = () => {
  return new ApplicationError(
    90004,
    ERROR_TYPES.AUTHENTICATION,
    'ExpiredTokenError',
    'The JWT token has expired. Please request a new token and try again.',
    STATUS.FORBIDDEN
  );
};

Errors.getInvalidAuthentication = () => {
  return new ApplicationError(
    90005,
    ERROR_TYPES.AUTHENTICATION,
    'InvalidAuthentication',
    'The credentials supplied were incorrect, please try again.',
    STATUS.FORBIDDEN
  );
};

Errors.getUnauthorizedError = (details) => {
  let message = 'You are not authorized to perform the requested operation.';
  if (details) {
    message = `${message} ${details}`;
  }
  return new ApplicationError(
    90006,
    ERROR_TYPES.AUTHORIZATION,
    'UnauthorizedError',
    message,
    STATUS.UNAUTHORIZED
  );
};

Errors.getOffsetError = () => {
  return new ApplicationError(
    90007,
    ERROR_TYPES.DATABASE,
    'OffsetError',
    'Offset must be an integer value greater than or equal to zero.',
    STATUS.BAD_REQUEST
  );
};

Errors.getLimitError = () => {
  return new ApplicationError(
    90008,
    ERROR_TYPES.DATABASE,
    'LimitError',
    'Limit must be an integer value greater than or equal to one.',
    STATUS.BAD_REQUEST
  );
};

Errors.getMissingFieldError = (options) => {
  return new ApplicationError(
    90009,
    ERROR_TYPES.DATABASE,
    'MissingFieldError',
    `The entity '${options.modelName}' does not have a field called '${options.fieldName}'.`,
    STATUS.BAD_REQUEST
  );
};

Errors.getConcurrencyError = (updatedItem) => {
  const appError = new ApplicationError(
    90010,
    ERROR_TYPES.DATABASE,
    'ConcurrencyError',
    'The item you are attempting to update is stale. Please ' +
    'update the item\'s timestamp then try again. You may ' +
    'want to merge updated data as well.',
    STATUS.CONFLICT
  );
  appError.updatedItem = updatedItem;
  return appError;
};

Errors.getNoEndPointError = (originalUrl) => {
  return new ApplicationError(
    90011,
    ERROR_TYPES.DATABASE,
    'NoEndPointError', '' +
    `The end point '${originalUrl}' does not exist.`,
    STATUS.NOT_FOUND
  );
};

Errors.getItemNotFoundError = (id, modelName, keyName) => {
  keyName = keyName || 'id';
  return new ApplicationError(
    90012,
    ERROR_TYPES.DATABASE,
    'ItemNotFoundError',
    `The item of type '${modelName}' with ${keyName} = '${id}' was not found.`,
    STATUS.NOT_FOUND
  );
};

Errors.getFieldIncludeExcludeError = () => {
  return new ApplicationError(
    90014,
    ERROR_TYPES.DATABASE,
    'FieldIncludeExcludeError',
    'You cannot mix included fields and excluded fields. You must provide one or the other.',
    STATUS.BAD_REQUEST
  );
};

Errors.getBadInputError = (details) => {
  let message = 'The JSON input is not properly formatted or a query parameter is invalid. Please check your data and try again.';
  if (details) {
    message = `${message} ${details}`;
  }
  return new ApplicationError(
    90015,
    ERROR_TYPES.VALIDATION,
    'BadInputError',
    message,
    STATUS.BAD_REQUEST
  );
};

Errors.getInvalidPropertyError = (propertyName) => {
  return new ApplicationError(
    90016,
    ERROR_TYPES.DATABASE,
    'InvalidPropertyError',
    `The property '${propertyName}' is invalid.`,
    STATUS.BAD_REQUEST
  );
};

Errors.getBodyNotAllowedError = () => {
  return new ApplicationError(
    90017,
    ERROR_TYPES.DATABASE,
    'BodyNotAllowedError',
    'The DELETE method does not allow body elements. Please try your call without a body.',
    STATUS.BAD_REQUEST
  );
};

Errors.getValidationError = (validationInfo) => {
  const validationError = new ApplicationError(
    90019,
    ERROR_TYPES.VALIDATION,
    'ValidationError',
    'One or more property values is missing or invalid. Please check your submission and try again.',
    STATUS.BAD_REQUEST
  );
  validationError.info = validationInfo;
  return validationError;
};

Errors.getBatchError = (createErrors, updateErrors, deleteErrors) => {
  const applicationError = new ApplicationError(
    90020,
    ERROR_TYPES.DATABASE,
    'BatchError',
    'One or more errors occurred when trying to apply the batch process.',
    STATUS.BAD_REQUEST
  );
  applicationError.createErrors = createErrors;
  applicationError.updateErrors = updateErrors;
  applicationError.deleteErrors = deleteErrors;
  return applicationError;
};

Errors.getUnsupportedMediaTypeError = () => {
  return new ApplicationError(
    90022,
    ERROR_TYPES.VALIDATION,
    'UnsupportedMediaTypeError',
    'Unsupported media type. Please check your submission and try again.  Media type must be application/json.',
    STATUS.BAD_REQUEST
  );
};

Errors.getInvalidFileError = (details) => {
  let message = 'The file you attempted to upload is invalid.';
  if (details) {
    message = `${message} ${details}`;
  }
  return new ApplicationError(
    90024,
    ERROR_TYPES.FILES,
    'InvalidFileError',
    message,
    STATUS.BAD_REQUEST
  );
};

Errors.getFileNotFoundError = (filePath) => {
  return new ApplicationError(
    90026,
    ERROR_TYPES.FILES,
    'FileNotFoundError',
    `The file you requested to download was not found: ${filePath}`,
    STATUS.BAD_REQUEST
  );
};

Errors.getHashFailedError = (error) => {
  return new ApplicationError(
    90027,
    ERROR_TYPES.VALIDATION,
    'HashFailedError',
    `The system faield to hash a password. ${error.message}`,
    STATUS.INTERNAL_SERVER_ERROR
  );
};

Errors.getErrorCollection = (errors) => {
  // If there is a single errors then return it rather than a collection.
  if (errors && errors.length === 1) {
    return errors[0];
  }
  const applicationError = new ApplicationError(
    90100,
    ERROR_TYPES.COLLECTION,
    'ErrorCollection',
    'One or more errors occurred.',
    STATUS.BAD_REQUEST
  );
  applicationError.errors = errors;
  return applicationError;
};

/**
 * Converts a Sequelize error to the REST standard error format.
 * @param {Object} sequelizeError A Sequelize error instance.
 * @returns {ApplicationError} An ApplicationError instance.
 */
function convertSequelizeError(sequelizeError) {
  let applicationError;
  if (sequelizeError.errors) {
    const errors = [];
    _.each(sequelizeError.errors, error => {
      const validationInfo = {
        name: sequelizeError.name,
        type: error.type,
        path: error.path,
        message: error.message
      };
      const validationError = Errors.getValidationError(validationInfo);
      errors.push(validationError);
    });
    applicationError = Errors.getErrorCollection(errors);
  } else {
    const status = (sequelizeError.name === 'SequelizeForeignKeyConstraintError') ? STATUS.CONFLICT : 400;
    applicationError = new ApplicationError(
      91001,
      ERROR_TYPES.DATABASE,
      sequelizeError.name,
      sequelizeError.message,
      status
    );
  }
  return applicationError;
}

/**
 * Formats error results by converting system errors and Sequelize
 * errors into the REST API standard error format.
 * @param {ApplicationError} error An ApplicationError instance.
 */
Errors.formatError = (error) => {
  if (error.name && error.name.match(/^Sequelize/g)) {
    error = convertSequelizeError(error);
  }
  if (!error.type) {
    error = Errors.getSystemError(error);
  }
  return error;
};


Errors.ApplicationError = ApplicationError;

module.exports = Errors;
