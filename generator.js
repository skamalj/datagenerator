const fs = require('fs');
const yaml = require('js-yaml');
const { Sinks } = require('./sinks.js');
const faker = require('faker');

class Generator {
    refRecords = {};
    recordSchemas = {};
    options;

    constructor(options) {
        this.options = options;
        this.loadRecordConfig();
        this.generateRefRecords();
    }

    // Goes through options and generates a record based on faker functions
    // Then writes the record to the socket
    genFakeRecord(sinks, schema) {
        var record = {};
        var recordSchema = this.recordSchemas[schema];
        var discardRecord = false;
        try {
            for (let col of recordSchema.schema) {
                if (col.namespace != "ref") {
                    record[col.name] = faker[col.namespace][col.function].apply(null, this.createArgsArray(col.args));
                    if (schema != "Master" && col.hasOwnProperty("unique") && col.unique) {
                        if (sinks[0].checkIfColValueExists(col.name, record[col.name])) {
                            discardRecord = true;
                            console.log("Discarding ref record due to unique constraint violation - " + JSON.stringify(record));
                        }
                    }
                    if (col.hasOwnProperty("anomaly") && this.getRandomInt(1, 101) <= col.anomaly.frequency) {
                        record[col.name] = record[col.name] * col.anomaly.magnitude
                    }
                } else {
                    record[col.name] = this.refRecords[col.function].get(this.getRandomInt(0, this.refRecords[col.function].length()));
                }
            }
            if (schema == "Master") {
                if (!this.options.noeventtime)
                    record["eventtime"] = Date.now();
                if (this.options.csv) record = this.convertToCSV(record)
            }
            if (!discardRecord) sinks.map(s => s.write(record))
            //sink.write(JSON.stringify(record));
        } catch (error) {
            console.log("Exception when writing record to client:" + error)
        }
    }

    convertToCSV(record) {
        csvRec = ""
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
    // Load record config from provided schema file or from default schema file
    loadRecordConfig() {
        let schemafile = this.options.schemafile ? this.options.schemafile : "./schema/config.yaml";
        try {
            var contents = fs.readFileSync(schemafile, 'utf8');
            var configdata = yaml.load(contents);

            for (const config of configdata.records) {
                if (config.hasOwnProperty("type") && config.type == "Ref") {
                    this.recordSchemas[config.name] = config;
                } else {
                    this.recordSchemas["Master"] = config;
                }
            }
            console.log('File processed. Options are: ' + JSON.stringify(this.recordSchemas));
        } catch (err) {
            console.error(err);
        }
    }

    // Generate reference records and store in memory sink
    generateRefRecords() {
        console.log("Generating reference records");
        for (let record in this.recordSchemas) {
            if (record != "Master") {
                this.refRecords[record] = new Sinks.memory();
                for (let i = 0; i < this.recordSchemas[record].count; i++) {
                    this.genFakeRecord([ this.refRecords[record] ], record);
                }
                console.log(this.refRecords[record].length()+" records generated for "+record);
            }
        }
    }
}
module.exports = { Generator }