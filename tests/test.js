const GameServer = require('./../server'),
      HTTP = require('http'),
      IO = require('socket.io'),
      util = require('./../util');

const port = 8080,
      httpServer = HTTP.createServer(),
      io = IO(httpServer),
      updatePlayerCount = a => console.log(`${a} players`);
const gameServer = new GameServer(io, util, updatePlayerCount);
httpServer.listen(port, () => console.log(`game server listening on port ${port}`));