const net = require('net');
const faker = require('faker');
const { once } = require('events');
const { createReadStream } = require('fs');
const { createInterface } = require('readline');

// Store for options defined in config
var optionsMap = [];
var interval = process.argv[2]

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
    setInterval(genFakeRecord, interval, c);
});
server.on('error', (err) => {
    throw err;
});

// Parse config files and save record options on options array
// Code commes from nodejs documentation "Readline module". 
(async function processLineByLine() {
    try {
        const rl = createInterface({
            input: createReadStream('config'),
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            if (!line.startsWith("#")) {
                option = line.split("|");
                optionsMap.push(option);
            }
        });

        await once(rl, 'close');

        console.log('File processed. Options are: ' + JSON.stringify(optionsMap));
    } catch (err) {
        console.error(err);
    }
})();

// Use the port from arguments or use default
server.listen(process.argv[3] || 4000, () => {
    console.log('server bound');
});

// Goes through options and generates a record based on faker functions
// Then writes the record to the socket
genFakeRecord = function (socket) {
    try {
        record = {};
        for (option of optionsMap) {
            record[option[2]] = faker[option[0]][option[1]].apply(null, createArgsArray(option.slice(3)));
        }
        socket.write(JSON.stringify(record)+"\n");
    } catch (error) {
        console.log("Exception when writing record to client:" + error)
    }
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