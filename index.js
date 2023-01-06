const net = require('net');
//Make options available globally
const { options } = require('./argparser.js');
global.options = options

const { Sinks } = require('./sinks.js');
const { Source } = require('./source.js');
const { DataGenerator } = require('./generator.js');
const { createAPIMocker, createConfigManagerAPI, createSourceAPI, createSinkAPI } = require('./api.js')
const { Distributor } = require('./distributor.js');
const { logger } = require('./logger')
const { SchemaManager} = require('./schema_manager')

logger.info(options)
// This is implemented as singleton, so create it once and making it available globally.
//  Avoids having to create module dependencies.  
global.schemaManager = SchemaManager.getInstance()
// Generator is singleton, so can be set globally. This avoids having to include generator module everywhere
// just to get this singleton instance 
global.generator = DataGenerator.getInstance();
Distributor.loadSinks()

createAPIMocker()
createConfigManagerAPI()
createSinkAPI()

// Create generators for sources 
const sources = Source.getInstance(options);

createSourceAPI()

// Create data server for console sink
const server = net.createServer({ allowHalfOpen: true }, (c) => {
    let socketAddress = c.address();
    let consoleSink = new Sinks.console(c);
    logger.info('Socket client connected');
    Distributor.addSink("console_default",consoleSink);
    c.on('end', () => {
        logger.info('Socket client disconnected');
        // On dis-connection, detach fake record generator
        Distributor.deleteSinkWithInstance(consoleSink)
    });
    c.on('error', () => {
        logger.info("Tried writing to client," + JSON.stringify(socketAddress) + ", which disconnected");
    });
});
server.on('error', (err) => {
    throw err;
});

// Data Server: Use the port from arguments or use default
server.listen(options.port || process.env.PORT || 4000, () => {
    logger.info('server bound');
});

