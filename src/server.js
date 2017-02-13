'use strict';

const jwt = require('jsonwebtoken');
const config = require('./config');
const compression = require('compression');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const login = require('./routes/login');
const enableCORS = require('./middleware/enableCORS');
const error = require('./middleware/error');
const io = require('socket.io')();
const locks = require('./classes/locks');

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
app.use(config.API_BASE, login);

// Build default API routes using the standard API.
require('./routes/_defaults')(app, io);

// Final catch-all.
app.use(error);

// Start the server.
app.listen(config.API_PORT);
console.log(`REST server started on port ${config.API_PORT}.`);


/*
 What follows is the socket pieces.
*/
io.on('connection', (socket) => {
  const token = socket.handshake.query.token;
  let userId = null;
  // TODO: Lock all of a user's items when disconnecting.

  socket.on('disconnect', () => {
    console.log(`User ID ${userId} disconnected`);
    locks.unlockByTokens(userId)
  });

  socket.on('LOCK', (data) => {
    locks.add(data);
  });

  socket.on('UNLOCK', (data) => {
    locks.remove(data);
  });

  if (token) {
    jwt.verify(token, config.TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log('User connection error.', err);
        socket.disconnect();
      }
      userId = decoded.sub;
      console.log(`User ID ${decoded.sub} connected.`);
    });
  } else {
    socket.disconnect();
  }
});
io.listen(config.SOCKET_PORT);
console.log(`Socket server started on port ${config.SOCKET_PORT}`);


