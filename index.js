const net = require('net');
const { Sinks } = require('./sinks.js');
const { program } = require('./argparser.js');
const { Generator } = require('./generator.js');



// Load generator environment. 
// Read here - https://github.com/motdotla/dotenv
require('dotenv').config()

// Read commandline arguments
const options = program.parse(process.argv).opts()
console.log(options)

const generator = new Generator(options);

// Store for record options defined in config
var interval = parseInt(options.interval) || process.env.INTERVAL || 1000
var enabledSinks = [];


// Create generator for pubsub
if (process.env.SINKS_PUBSUB == "Y" || process.env.SINKS_PUBSUB == "y") {
    let pubsub = new Sinks.pubsub();
    enabledSinks.push(pubsub);
}
// Create generator for Kinesis
if (process.env.SINKS_KINESIS == "Y" || process.env.SINKS_KINESIS == "y") {
    let kinesis = new Sinks.kinesis();
    enabledSinks.push(kinesis);
}
// Create generator for EventsHub
if (process.env.SINKS_EVENTS_HUB == "Y" || process.env.SINKS_EVENTS_HUB == "y") {
    let eventshub = new Sinks.eventshub();
    enabledSinks.push(eventshub);
}

// Anonymous function is used to avoid scope issues with *this*
let intervalId = setInterval(() => generator.genFakeRecord(enabledSinks,"Master"), interval);
if (options.timeout)
    setTimeout(() => {
        clearInterval(intervalId)
    }, parseInt(options.timeout) * 60 * 1000);


// Create TCP server
const server = net.createServer({ allowHalfOpen: true }, (c) => {
    let socketAddress = c.address();
    let consoleSink = new Sinks.console(c);
    console.log('Socket client connected');
    enabledSinks.push(consoleSink);
    c.on('end', () => {
        console.log('Socket client disconnected');
        // On dis-connection, detach fake record generator
        const index = enabledSinks.indexOf(consoleSink);
        if (index > -1) {
            enabledSinks.splice(index, 1);
        }
    });
    c.on('error', () => {
        console.log("Tried writing to client," + JSON.stringify(socketAddress) + ", which disconnected");
    });
});
server.on('error', (err) => {
    throw err;
});

// Use the port from arguments or use default
server.listen(options.port || process.env.PORT || 4000, () => {
    console.log('server bound');
});