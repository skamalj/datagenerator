const net = require('net');
const faker = require('faker');
const { once } = require('events');
const { createReadStream } = require('fs');
const { createInterface } = require('readline');
const { Sinks } = require('./sinks.js');
const { program } = require('./argparser.js');

// Load generator environment. 
// Read here - https://github.com/motdotla/dotenv
require('dotenv').config()

// Read commandline arguments
const options = program.parse(process.argv).opts()
console.log(options)

// Store for record options defined in config
var optionsMap = [];
var interval = parseInt(options.interval) || process.env.INTERVAL || 1000

// Goes through options and generates a record based on faker functions
// Then writes the record to the socket
genFakeRecord = function (sink) {
    try {
        record = {};
        for (option of optionsMap) {
            record[option[2]] = faker[option[0]][option[1]].apply(null, createArgsArray(option.slice(3)));
        }
        if (!options.noeventtime)
            record["eventtime"] = Date.now();
        if (options.csv) record = convertToCSV(record)       
        sink.write(JSON.stringify(record) + "\n");
    } catch (error) {
        console.log("Exception when writing record to client:" + error)
    }
}

convertToCSV= function (record) {
    csvRec = ""
    Object.values(record).forEach(v => csvRec=csvRec+","+v)
    return csvRec.substring(1);
}

// Parse string arguments back to JSON where possible, else return the args as is
createArgsArray = function (args) {
    parsedArgs = args.map((arg) => {
        try {
            return JSON.parse(arg);
        } catch (error) {
            return arg
        }
    })
    return parsedArgs;
}

// Create generator for pubsub
if (process.env.SINKS_PUBSUB == "Y" || process.env.SINKS_PUBSUB == "y") {
    let pubsub = new Sinks.pubsub();
    let intervalId = setInterval(genFakeRecord, interval, pubsub);
    if (options.timeout)
        setTimeout(() => {
            clearInterval(intervalId)
        }, parseInt(options.timeout) * 60 * 1000);
}

// Create generator for Kinesis
if (process.env.SINKS_KINESIS == "Y" || process.env.SINKS_KINESIS == "y") {
    let kinesis = new Sinks.kinesis();
    let intervalId = setInterval(genFakeRecord, interval, kinesis);
    if (options.timeout)
        setTimeout(() => {
            clearInterval(intervalId)
        }, parseInt(options.timeout) * 60 * 1000);
}

// Create generator for Events Hub
if (process.env.SINKS_EVENTS_HUB == "Y" || process.env.SINKS_EVENTS_HUB == "y") {
    let eventshub = new Sinks.eventshub();
    let intervalId = setInterval(genFakeRecord, interval, eventshub);
    if (options.timeout)
        setTimeout(() => {
            clearInterval(intervalId)
        }, parseInt(options.timeout) * 60 * 1000);
}

// Parse config file and save record options on options array
// Code taken from nodejs documentation "Readline module". 
(async function processRecordOptions() {
    try {
        const rl = createInterface({
            input: createReadStream('config'),
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            if (!line.startsWith("#")) {
                option = line.trim().split("|");
                if (option && option != "") optionsMap.push(option);
            }
        });

        await once(rl, 'close');

        console.log('File processed. Options are: ' + JSON.stringify(optionsMap));
    } catch (err) {
        console.error(err);
    }
})();

// Create TCP server
const server = net.createServer({ allowHalfOpen: true }, (c) => {
    socketAddress = c.address();
    console.log('client connected');
    c.on('end', () => {
        console.log('client disconnected');
    });

    c.on('error', () => {
        console.log("Tried writing to client," + JSON.stringify(socketAddress) + ", which disconnected");
    });
    // On connection, attach fake record generator to the client. 
    // Interval must be passed on command line.
    if (process.env.SINKS_CONSOLE == "Y" || process.env.SINKS_CONSOLE == "y") {
        let intervalId = setInterval(genFakeRecord, interval, c);
        if (options.timeout)
            setTimeout(() => {
                clearInterval(intervalId)
                c.destroy()
            }, parseInt(options.timeout) * 60 * 1000);
    }
});

server.on('error', (err) => {
    throw err;
});

// Use the port from arguments or use default
server.listen(options.port || process.env.PORT || 4000, () => {
    console.log('server bound');
});