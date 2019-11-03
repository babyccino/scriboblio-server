const promisify = require('util').promisify,
			request = promisify(require('request')),
			commandLineArgs = require('command-line-args'),
			config = require('./config'),
			ec2 = new (require('aws-sdk/clients/ec2'))(config.aws),
			terminateInstances = promisify(ec2.terminateInstances),
			redisClient = require('redis').createClient(config.redis.port, config.redis.ip);

const { makeRedisCacheFunc, initServer, createServers } = require('./makeServers');

const optionDefinitions = [
	{ name: 'port', alias: 'p', type: Number },
	{ name: 'serverCount', alias: 's', type: Number },
	{ name: 'permanent', type: Boolean }
];
const metaData = Promise.all([
	request("http://169.254.169.254/latest/meta-data/public-ipv4"),
	request("http://169.254.169.254/latest/meta-data/instance-id")
]);
function main() {
	const options = commandLineArgs(optionDefinitions);
	const port = options.port || 8080,
				serverCount = options.serverCount || 1,
				permanent = options.permanent || false;

	metaData.then(values => {
		const ip = values[0].body,
					instanceId = values[1].body,
					cache = makeRedisCacheFunc(ip, instanceId, redisClient);
		const terminateThisInstance = async () => {
			await terminateInstances({ InstanceIds: [instanceId] });
			process.exit();
		};
		console.log(`ip: ${ip}, instance id: ${instanceId}`);
		createServers(port, serverCount, permanent, terminateThisInstance, cache, initServer);
	});
}

redisClient.on('connect', main);
