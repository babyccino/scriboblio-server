const GameServer = require('./server'),
			HTTP = require('http'),
			Promisify = require('util').promisify,
			Request = Promisify(require('request')),
			CommandLineArgs = require('command-line-args'),
			IO = require('socket.io'),
			util = require('./util'),
			config = require('./config'),
			ec2 = new (require('aws-sdk/clients/ec2'))(/* config.aws */),
			terminateInstances = Promisify(ec2.terminateInstances),
			redisClient = require('redis').createClient(/* config.redis.port, config.redis.ip */);

async function terminateThisInstance(instanceId) {
	await terminateInstances({InstanceIds: [instanceId]});
	process.exit();
}

function createServers(ip, port, instanceId, serverCount, permanent) {
	let servers = new Array(serverCount),
			timeout;
	for (let i = 0; i < serverCount; ++i) {
		const uri = `${ip}:${port + i}`;
		const updatePlayerCount = playerCount => {
			redisClient.hmset([uri, "playerCount", playerCount, 'instanceId', instanceId]);
			redisClient.zadd(['playerCountIndex', playerCount, uri]);

			servers[i] = playerCount;
			if (!permanent) {
				if (playerCount == 0) {
					for (let ii = 0; ii < serverCount; ++ii) {
						if (servers[i] !== 0) return;
					}

					if (!timeout) {
						timeout = setTimeout(terminateThisInstance.bind(null, instanceId), 30000);
					}
				} else {
					clearTimeout(timeout);
				}
			}
		}
		const httpServer = HTTP.createServer(),
					io = IO(httpServer);
		const gameServer = new GameServer(io, util, updatePlayerCount);
		httpServer.listen(port + i);
	}
}

const optionDefinitions = [
	{ name: 'port', alias: 'p', type: Number },
	{ name: 'serverCount', alias: 'sc', type: Number },
	{ name: 'permanent', alias: 'pm', type: Boolean }
];
const metaData = Promise.all([
	Request("http://169.254.169.254/latest/meta-data/public-ipv4"),
	Request("http://169.254.169.254/latest/meta-data/instance-id")
]);
function main() {
	const options = CommandLineArgs(optionDefinitions)
	const port = options.port || 8080,
				serverCount = options.serverCount || 1,
				permanent = options.permanent || false;

	metaData.then(values => {
		const ip = values[0].body,
					instanceId = values[1].body;
		console.log(`ip: ${ip}, instance id: ${instanceId}`);
		createServers(ip, port, instanceId, serverCount, permanent);
	})
}

redisClient.on('connect', main);
