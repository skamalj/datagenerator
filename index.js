const net = require('net');
const { Sinks } = require('./sinks.js');
const { Source } = require('./source.js');
const { program } = require('./argparser.js');
const { RefDataGenerator } = require('./generator.js');
const { createAPIMocker, createConfigManagerAPI, createSourceAPI } = require('./api.js')
const { SchemaManager } = require('./schema_manager')

// Load generator environment. 
// Read here - https://github.com/motdotla/dotenv
require('dotenv').config()

// Read commandline arguments
const options = program.parse(process.argv).opts()
console.log(options)

// Multiple generator instances are created to simulate multiple sources.
// Only one generator instance is created to load reference records
// This genearator instance is then used to pass reference data to other data generatorss
// whose number depends upon the number of sources configured.
const refDataGenerator = RefDataGenerator.getInstance(options);

createAPIMocker(refDataGenerator.refRecords, refDataGenerator.recordSchemas, 3000)
createConfigManagerAPI()

// Store for record options defined in config
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
// Create generator for KAFKA
if (process.env.SINKS_KAFKA == "Y" || process.env.SINKS_KAFKA == "y") {
    let kafka = new Sinks.kafka();
    kafka.init(enabledSinks);
}
// Create File sink
if (process.env.SINKS_FILE == "Y" || process.env.SINKS_FILE == "y") {
    let filesink = new Sinks.filesink(process.env.FILE_SINK_PATH, process.env.FILE_SINK_MAX_RECORDS,
        process.env.NO_OF_FILES,enabledSinks);
    enabledSinks.push(filesink);
}


// Create generators for sources 
const sources = Source.getInstance(options, enabledSinks);

createSourceAPI()

// Create data server for console sink
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

// Data Server: Use the port from arguments or use default
server.listen(options.port || process.env.PORT || 4000, () => {
    console.log('server bound');
});

