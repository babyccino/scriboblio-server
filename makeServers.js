const GameServer = require('./server'),
      HTTP = require('http'),
      IO = require('socket.io'),
      util = require('./util');

const makeRedisCacheFunc = (ip, instanceId, redisClient) => (port, playerCount) => {
  const uri = `${ip}:${port}`;
  redisClient.hmset([uri, "playerCount", playerCount, 'instanceId', instanceId]);
  redisClient.zadd(['playerCountIndex', playerCount, uri]);
}

const initServer = (port, updatePlayerCount) => {
  const httpServer = HTTP.createServer(),
    io = IO(httpServer);
  const gameServer = new GameServer(io, util, updatePlayerCount);
  httpServer.listen(port);
};

const createServers = (startingPort, serverCount, permanent, terminateThisInstance, cache, initServer) => {
  let serverPlayerCounts = new Array(serverCount),
      timeout;
  for (let serverNumber = 0; serverNumber < serverCount; ++serverNumber) {
    const port = startingPort + serverNumber;
    const updatePlayerCount = playerCount => {
      cache(port, playerCount);

      serverPlayerCounts[serverNumber] = playerCount;
      if (!permanent) {
        if (playerCount == 0) {
          for (let ii = 0; ii < serverCount; ++ii) {
            if (serverPlayerCounts[serverNumber] !== 0) return;
          }

          if (!timeout) {
            timeout = setTimeout(terminateThisInstance, 30000);
          }
        } else {
          clearTimeout(timeout);
        }
      }
    };
    updatePlayerCount(0);
    initServer(port, updatePlayerCount);
  }
}

module.exports = {
  makeRedisCacheFunc,
  initServer,
  createServers,
};