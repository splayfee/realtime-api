const bcrypt = require('bcrypt');
const Errors = require('../classes/Errors');
const ModelRoutes = require('../classes/ModelRoutes');

const hashPassword = (req, res, next) => {
  const user = req.body;
  if (user.password) {
    bcrypt.genSalt(10, (err1, salt) => {
      if (err1) {
        ModelRoutes.handleError(res, Errors.getHashFailedError());
      } else {
        bcrypt.hash(user.password, salt, (err2, hash) => {
          if (err2) {
            ModelRoutes.handleError(res, Errors.getHashFailedError());
          } else {
            req.body.password = hash;
            next();
          }
        });
      }
    });
  } else {
    next();
  }
};

module.exports = hashPassword;
