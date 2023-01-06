const { logger } = require('./logger')

let Sinks = {}

Sinks.pubsub = class pubsub {
    #pubsub;
    constructor(config) {
        const { PubSub } = require('@google-cloud/pubsub');
        this.projectId = config.projectId
        this.topic = config.topic
        this.#pubsub = new PubSub({ projectId: this.projectId })
    }
    write(rec) {
        try {
            this.#pubsub.topic(this.topic)
                .publishMessage(
                    { data: Buffer.from(JSON.stringify(rec)) }
                ).then(res => {
                    logger.debug("Message " + rec + " published with ID: " + res)
                })
                .catch(error => logger.error("Rec --" + JSON.stringify(rec) + "-- not published to Pubsub" + error))
        } catch (error) {
            logger.error("Rec --" + JSON.stringify(rec) + "-- not published to Pubsub" + error)
        }
    }
}

Sinks.kinesis = class kinesis {
    #kinesis;
    #streamname;
    constructor(config) {
        const { KinesisClient } = require("@aws-sdk/client-kinesis");
        this.#streamname = config.streamName
        this.#kinesis = new KinesisClient({ region: config.region });
    }
    write(rec) {
        const {PutRecordCommand } = require("@aws-sdk/client-kinesis");
        try {
            let [partkey] = Object.keys(rec);
            var params = {
                Data: Buffer.from(JSON.stringify(rec)),
                PartitionKey: (rec[partkey]).toString(),
                StreamName: this.#streamname
            };
            const command = new PutRecordCommand(params);
            this.#kinesis.send(command).then((data) => {
                logger.debug("Message " + rec + " published to kinesis with result: " + JSON.stringify(data));
            })
                .catch((error) => {
                    logger.error("Promise Error: Rec --" + JSON.stringify(rec) + "-- not published to kinesis " + error);
                });
        } catch (error) {
            logger.error("Rec --" + JSON.stringify(rec) + "-- not published to kinesis " + error);
        }
    }
}

Sinks.eventshub = class EventsHub {
    #producer;
    constructor(config) {
        const { EventHubProducerClient } = require("@azure/event-hubs");
        this.#producer = new EventHubProducerClient(config.eventshubConnectionString,
            config.eventshubName);
    }
    write(rec) {
        this.#producer.createBatch()
            .then((batch) => {
                if (batch.tryAdd({ body: rec }))
                    return this.#producer.sendBatch(batch)
                else
                    throw new Error("Record --" + rec + "-- not added to batch")
            })
            .then(() => {
                if (!(process.env.SUPPRESS_SUCCESS_MESSAGE_LOG == 'Y'
                    || process.env.SUPPRESS_SUCCESS_MESSAGE_LOG == 'y'))
                    logger.info("Message " + rec + " published to azure events hub");
            })
            .catch((error) => {
                logger.info("Record --" + rec + "-- not published to azure events hub: " + error);
            })

    }
}
// In memory sink for storing REF records
Sinks.memory = class memory {D
    #mem;
    #removed_recs = []
    constructor() {
        this.#mem = []
    }
    write(rec) {
        this.#mem.push(rec)
    }
    get(i) {
        return i != undefined ? this.#mem[i] : this.#mem
    }
    remove(i) {
        let rec = this.#mem.splice(i, 1);
        this.#removed_recs.push(rec);
        logger.info(`Removed record:   ${JSON.stringify(rec)}, sink has now ${this.#mem.length} records`);
    }
    length() {
        return this.#mem.length
    }
    checkIfColValueExists(colName, colValue) {
        return this.#mem.filter(rec => rec[colName] == colValue).length > 0
    }
    getElementByValue(colName, colValue) {
        return this.#mem.filter(rec => rec[colName] == colValue)
    }
    removeElementByValue(colName, colValue) {
        let element =  this.#mem.filter(rec => rec[colName] == colValue)
        this.#mem = this.#mem.filter(rec => rec[colName] != colValue)
        return element
    }
}
//Console sink for testing
Sinks.console = class console {
    #con;
    constructor(con) {
        this.#con = con
    }
    write(rec) {
        try {
            JSON.parse(rec)
            this.#con.write(rec + "\n");
        } catch (error) {
            this.#con.write(JSON.stringify(rec) + "\n");
        }
    }
}

// Create file sink using fs module, with limit of max_records

Sinks.filesink = class FileSink {
    #basefilename
    #file;
    #max_records;
    #no_of_files = 10
    #records_written = 0
    #files_written = 0
    #contents = ''
    #destination
    #config
    constructor(config) {
        this.#file = config.baseName + '_0.json'
        this.#basefilename = config.baseName
        this.#max_records = config.batchSize ? config.batchSize : 5000
        this.#no_of_files = config.numOfFiles ? config.numOfFiles : 1
        this.#destination = config.destination ? config.destination : 'local'
        this.#config = config
    }
    // Remove sink from array enabledsinks
    disable() {
        this.status = "INACTIVE"
    }

    write(rec) {
        var parsed_rec
        try {
            JSON.parse(rec) 
            parsed_rec = rec + "\n"    
        } catch (error) {
            parsed_rec = JSON.stringify(rec) + "\n"    
        }
        if ((this.#records_written < this.#max_records)  && (this.#files_written < this.#no_of_files)) {
            this.#records_written++
            this.#contents += parsed_rec;
        } else if (this.#files_written < this.#no_of_files) {
            this.#files_written++
            this.#records_written = 0
            this.createFile(this.#file, this.#contents)
            this.#contents=''
            this.#file = this.#basefilename + '_' + this.#files_written + '.json'
        } else {
            this.disable();
        }
    }
    createFile(file, contents){
        switch(this.#destination) {
            case 'S3':
                this.pushToS3(file,contents)
                break;
            default:
                this.createLocalFile(file,contents)
        }
    }
    pushToS3(file,contents) {
        const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
        var s3 = new S3Client();
        var params = {
            Body: Buffer.from(contents,"utf-8"), 
            Bucket: this.#config.s3BucketName, 
            Key: file
           };
           s3.send(new PutObjectCommand(params), function(err, data) {
             if (err) logger.error(err, err.stack); 
             else     logger.info(`File ${file} pushed to S3`);        
           });
    }
    createLocalFile(file, contents) {
        const fs = require('fs');
        var data = Buffer.from(contents,'utf-8')
        fs.open(file,'a' , function(err, fd) {
            if (err) {
                logger.info(`Cannot open file ${file}`)
            } else {
                fs.write(fd,data, 0, data.lenght, null, function(err, byteswritten) {
                    if (err) { 
                        logger.error(`Cannot write to file ${file}: ${err}`)
                    } else {
                        logger.info(`File ${file} created`)
                    }
                })
            }
        })
    }
}

// Create kafka sink using kafkajs module
Sinks.kafka = class Kafka {
    #topic;
    #producer;
    constructor(config) {

        const { Kafka } = require('kafkajs')
        const kafka = new Kafka({
            clientId: 'generator-app',
            brokers: config.brokers.split(","),
            connectionTimeout: 5000,
            authenticationTimeout: 5000,
            reauthenticationThreshold: 20000,
            ssl: true,
            sasl: {
                mechanism: 'plain', 
                username: config.saslUsername,
                password: config.saslPassword
             },
        });

        this.#producer = kafka.producer()
        this.#topic = config.topic
        this.init()
    }
    init() {
        logger.info("Initializing kafka sink")
        this.#producer.connect()
        .then(() => {
            logger.info(`Kafka sink connected for topic ${this.#topic}`);
        })
        .catch((error) => {
            logger.info(`Kafka sink not connected for topic ${this.#topic}: ${error}`);
        })
    }
    write(rec) {
        this.#producer.send({
            topic: this.#topic,
            messages: [
                {value: JSON.stringify(rec) }
            ],
            acks: 0
        })
        .then(() => {})
        .catch((error) => {
            logger.info(`Error sending record to kafka: ${error}`);
        })
    }
}

module.exports = { Sinks }