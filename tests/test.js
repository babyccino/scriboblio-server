const GameServer = require('./../server'),
      HTTP = require('http'),
      IO = require('socket.io'),
      util = require('./../util');

const httpServer = HTTP.createServer(),
      io = IO(httpServer),
      updatePlayerCount = a => console.log(`${a} players`);
const gameServer = new GameServer(httpServer, io, util, updatePlayerCount);
gameServer.listen(8080);