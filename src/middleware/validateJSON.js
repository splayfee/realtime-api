'use strict';

const Errors = require('../classes/Errors');
const METHODS = require('../enums/http_methods');
const STATUS = require('../enums/http_status');


/**
 * Middleware used to validate a JSON payload.
 */
function validateJSON(req, res, next) {
  const method = req.method.toLowerCase();
  if (method === METHODS.POST || method === METHODS.PUT || method === METHODS.PATCH) {
    const reqHeaders = req.headers['content-type'];
    // The submission has no data, all relevant data is in the end point params.
    if (!reqHeaders || reqHeaders.substr(0, 16) !== 'application/json') {
      res.status(STATUS.UNSUPPORTED_MEDIA_TYPE).send(Errors.getUnsupportedMediaTypeError());
    } else {
      next();
    }
  } else if (method === METHODS.DELETE && req.body && Object.keys(req.body).length > 0) {
    const error = Errors.getBodyNotAllowedError();
    res.status(error.status).send(error);
  } else {
    next();
  }
}

module.exports = validateJSON;
