const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const config = require('../config');
const db = require('../models');
const Errors = require('../classes/Errors');
const ModelRoutes = require('../classes/ModelRoutes');


const authenticate = (req, res) => {
  if (req.body.password) {
    const password = req.body.password;
    db.user.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (user) {
          bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
              ModelRoutes.handleError(res, Errors.getInvalidAuthentication());
            }
            if (result) {
              delete user.dataValues.password;
              const claims = {
                algorithm: 'HS512',
                audience: [],
                subject: user.id.toString(),
                issuer: 'edium.com',
                expiresIn: 86400
              };
              user.dataValues[config.JWT_KEY] = jwt.sign({ success: true }, config.TOKEN_SECRET, claims);
              res.json(user);
            } else {
              ModelRoutes.handleError(res, Errors.getInvalidAuthentication());
            }
          });
        } else {
          ModelRoutes.handleError(res, Errors.getInvalidAuthentication());
        }
      })
      .catch(error => {
        ModelRoutes.handleError(res, error);
      });
  } else {
    ModelRoutes.handleError(res, Errors.getInvalidAuthentication());
  }
};

module.exports = authenticate;

