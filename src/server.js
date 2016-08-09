'use strict';

const config = require('./config');
const compression = require('compression');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const authentication = require('./routes/authentication');
const enableCORS = require('./middleware/enableCORS');
const validateJSON = require('./middleware/validateJSON');
const error = require('./middleware/error');

const app = express();

// log every request to the console
app.use(morgan('dev'));

// Allow server to use compression with the client
app.use(compression());

// parse application/x-www-form-urlencoded
app.use(bodyParser.json({ limit: config.LIMIT }));
app.use(bodyParser.urlencoded({ extended: true }));

// middleware to enable cross origin communication via CORS
app.use(enableCORS);

// This route is not protected by middleware.
app.use(config.API_BASE, authentication);

// Build default API routes using the standard API.
require('./routes/_defaults')(app);

// Final catch-all.
app.use(error);

// Start the server.
app.listen(config.API_PORT);
console.log(`REST server started on port  ${config.API_PORT}.`);
