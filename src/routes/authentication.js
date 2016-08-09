'use strict';

const express = require('express');
const validateJSON = require('../middleware/validateJSON');
const authenticate = require('../middleware/authenticate');

const router = express.Router({ mergeParams: true });

router.post('/authenticate', validateJSON, authenticate);

module.exports = router;
