const net = require('net');
const { Sinks } = require('./sinks.js');
const { Source } = require('./source.js');
const { program } = require('./argparser.js');
const { RefDataGenerator } = require('./generator.js');
const { createAPIMocker, createConfigManagerAPI } = require('./api.js')
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
const sources = new Source(options, enabledSinks);

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

// Create Management server
// This can be used to add/remove sources and sinks(ToDo)
const management_server = net.createServer({ allowHalfOpen: true }, (c) => {
    c.on('end', () => {
        console.log('Management client disconnected');
    });
    c.on('error', (err) => {
        console.log("Management Server: " + err);
    });
    c.on('data', (cmd) => {
        console.log("Management Server Recieved Commmand: " + cmd);
        let words = cmd.toString().split(" ").filter(Boolean);
        switch (words[0] ? words[0].trim() : "") {
            case "source":
                switch (words[1] ? words[1].trim() : "") {
                    case "start":
                        sources.startSource(parseInt(words[2]));
                        break;
                    case "stop":
                        sources.stopSource(parseInt(words[2]));
                        break;
                    case "count":
                        c.write(sources.getRunningSources());
                        break;
                    case "interval":
                        sources.resetInterval(parseInt(words[2]));
                        break;
                    default:
                        c.write("Usage : source start|stop|count <source number>. Recieved argument: " + words[1]);
                        break;
                }
                break;
            case "sink":
                switch (words[1] ? words[1].trim() : "") {
                    case "list":
                        c.write(sources.listEnabledSinks());
                        break;
                    default:
                        c.write("Usage : sink list. Recieved argument: " + words[1]);
                        break;
                }
                break;
            case "exit":
                c.destroy();
                break;
            default:
                c.write("Usage : source start|stop|count <source number>. Unknown command: " + words[0]);
                break;
        }

    });
});
management_server.on('error', (err) => {
    throw err;
});

// Data Server: Use the port from arguments or use default
server.listen(options.port || process.env.PORT || 4000, () => {
    console.log('server bound');
});

// Management Server: Use the port from arguments or use default
management_server.listen(options.management_port || process.env.MGMT_PORT || 4001, () => {
    console.log('Management server bound');
});
