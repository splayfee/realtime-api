'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const Errors = require('../classes/Errors');
const ModelRoutes = require('../classes/ModelRoutes');

const verifyToken = (req, res, next) => {
  // THE JWT can be sent via he headers or a form POST.
  const token = req.headers[config.JWT_KEY] || req.body[config.JWT_KEY];

  // Provide for a test token during development.
  if (config.ENV === 'development' && (token === 'realtime' || req.query.api_key === 'realtime')) {
    delete req.query.api_key;
    req.decoded = {
      success: true,
      iat: 1000000000,
      exp: 9999999999,
      aud: [],
      iss: 'edium.com',
      sub: Number.MAX_VALUE.toString()
    };
    return next();
  }

  if (token) {
    jwt.verify(token, config.TOKEN_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return ModelRoutes.handleError(res, Errors.getExpiredTokenError());
        }
        return ModelRoutes.handleError(res, Errors.getInvalidTokenError());
      }
      req.decoded = decoded;
      next();
    });
  } else {
    ModelRoutes.handleError(res, Errors.getMissingTokenError());
  }
};

module.exports = verifyToken;
