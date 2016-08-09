'use strict';

const chalk = require('chalk');
const Errors = require('../classes/Errors');
const ModelRoutes = require('../classes/ModelRoutes');


module.exports = (err, req, res, next) => {
  // Catch invalid JSON format.
  if (err.statusCode === 400) {
    ModelRoutes.handleError(res, Errors.getBadInputError());
  } else {
    console.error(chalk.red(err.message), err.stack);
    ModelRoutes.handleError(res, err);
  }
  next();
};
