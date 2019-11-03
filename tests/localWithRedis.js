const commandLineArgs = require('command-line-args'),
      redisClient = require('redis').createClient();

const { makeRedisCacheFunc, initServer, createServers } = require('./../makeServers');

const optionDefinitions = [
  { name: 'port', alias: 'p', type: Number },
  { name: 'serverCount', alias: 's', type: Number },
  { name: 'permanent', type: Boolean }
];
function main() {
  const options = commandLineArgs(optionDefinitions)
  const port = options.port || 8080,
        serverCount = options.serverCount || 1,
        permanent = options.permanent || false;

  const ip = "localhost",
        instanceId = 0
        cache = makeRedisCacheFunc(ip, instanceId, redisClient),
        terminateThisInstance = () => process.exit(0);
  console.log(`ip: ${ip}, instance id: ${instanceId}`);
  createServers(port, serverCount, permanent, terminateThisInstance, cache, initServer);
}

redisClient.on('connect', main);
