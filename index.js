const server = require('http').createServer();
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('event', (data) => {

  });
  socket.on('disconnect', () => {

  });
});

server.listen(7001);
