const { Sinks } = require('./sinks.js');
const { faker }= require('./faker.js');
const { logger } = require('./logger')
const {eventEmitter} = require('./eventhandler')

class Generator {

    constructor(options) {
        this.options = options;
        this.refRecords = {};
        this.generateRefRecords();
        this.registerSchemaChangeListeners(eventEmitter)
    }

    getRefRecords() {
        return this.refRecords
    }

    // Goes through options and generates a record based on faker functions
    // Then writes the record to the socket
    genFakeRecord(sinks, schema, source) {
        var record = {};
        var recordSchema = (global.schemaManager.getSchemas())[schema];
        var discardRecord = false;
        try {
            for (let col of recordSchema.schema) {
                if (col.namespace != "ref") {
                    record[col.name] = this.assignFakerColValue(col)
                    if (schema != "Master" && col.hasOwnProperty("unique") && col.unique) {
                        if (sinks[0].checkIfColValueExists(col.name, record[col.name])) {
                            discardRecord = true;
                            logger.debug("Discarding ref record due to unique constraint violation - " + JSON.stringify(record));
                        }
                    }
                } else 
                    record[col.name] = this.assignRefColValue(col)
            }
            if (schema == "Master") {
                if (!this.options.noeventtime)
                    record["eventtime"] = Date.now();
                if (source && Object.keys(source).length > 0)
                    record["source"] = source;
                if (this.options.csv) record = this.convertToCSV(record)
            }
            if (!discardRecord) sinks.map(s => s.write(record))
        } catch (error) {
            logger.error("Exception when writing record to client: " + error)
        }
    }

    assignFakerColValue(col) {
        var colValue;
        if (col.count && col.count > 1)
            colValue =  [...Array(col.count).keys(0)].map(x =>
                            faker[col.namespace][col.function].apply(null, this.createArgsArray(col.args))
                        )
        else {
            colValue = faker[col.namespace][col.function].apply(null, this.createArgsArray(col.args))
            if (col.hasOwnProperty("anomaly") && this.getRandomInt(1, 101) <= col.anomaly.frequency) {
                colValue = typeof(colValue) == "number" ? colValue * col.anomaly.magnitude : colValue
            }
        }
        return colValue
    }   

    assignRefColValue(col) {
        var colValue;
        if (col.count && col.count > 1)
            return colValue =  [...Array(col.count).keys(0)].map(x => this.getRefColValue(col))
        else
            colValue = this.getRefColValue(col)
        return colValue    
    }

    getRefColValue(col) {
        var s = (global.schemaManager.getSchemas())[col.function]
        if (s.count)
            return  this.refRecords[col.function].get(this.getRandomInt(0, this.refRecords[col.function].length()))
        else {
            this.generateRefRecordsForSchema(col.function)
            return this.refRecords[col.function].get(0) 
        }
            
    }

    
    convertToCSV(record) {
        let csvRec = ""
        Object.values(record).forEach(v => csvRec = csvRec + "," + v)
        return csvRec.substring(1);
    }

    // Parse string arguments back to JSON where possible, else return the args as is
    createArgsArray(args) {
        if (args) {
            let parsedArgs = args.map((arg) => {
                try {
                    return JSON.parse(arg);
                } catch (error) {
                    return arg
                }
            })
            return parsedArgs;
        }
    }
    // Get random Integer between min and max
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        //The maximum is exclusive and the minimum is inclusive
        return Math.floor(Math.random() * (max - min)) + min;
    }

    // Generate reference records and store in memory sink
    generateRefRecords() {
        logger.info("Generating reference records");
        var recordSchemas = global.schemaManager.getSchemas();
        for (let schema in recordSchemas) {
            if (schema != "Master") {
                this.generateRefRecordsForSchema(schema)
            }
        }
    }

    generateRefRecordsForSchema(schema) {
        var recordSchemas = global.schemaManager.getSchemas();
        this.refRecords[schema] = new Sinks.memory();
        var count = recordSchemas[schema].count ? recordSchemas[schema].count : 1
        for (let i = 0; i < count; i++) {
            this.genFakeRecord([this.refRecords[schema]], schema);
        }
        logger.debug(this.refRecords[schema].length() + " records generated for " + schema);
    }

    registerSchemaChangeListeners(e) {
        e.on('SCHEMA_ADDED', schema => {
            if(schema != 'MASTER') setImmediate(() => {
                this.generateRefRecordsForSchema(schema)
            })
        });
        e.on('SCHEMA_DELETED', schema => {
            if(schema != 'MASTER') delete this.refRecords[schema]
        });
    }
    
}

class DataGenerator {
    static getInstance() {
        if (DataGenerator.instance)
            return DataGenerator.instance
        else 
            return DataGenerator.instance = new Generator(global.options)
    }
}

module.exports = { Generator, DataGenerator }