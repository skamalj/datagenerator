let Sinks = {}

Sinks.pubsub = class pubsub {
    #pubsub;
    constructor() {
        const { PubSub } = require('@google-cloud/pubsub');
        this.projectId = process.env.PUBSUB_PROJECT_ID
        this.topic = process.env.PUBSUB_TOPIC
        this.#pubsub = new PubSub({ projectId: this.projectId })
    }
    write(rec) {
        try {
            this.#pubsub.topic(this.topic)
                .publishMessage(
                    { data: Buffer.from(JSON.stringify(rec)) }
                ).then(res => {
                    if (!(process.env.SUPPRESS_SUCCESS_MESSAGE_LOG == 'Y'
                        || process.env.SUPPRESS_SUCCESS_MESSAGE_LOG == 'y'))
                        console.log("Message " + rec + " published with ID: " + res)
                })
                .catch(error => console.log("Rec --" + JSON.stringify(rec) + "-- not published to Pubsub" + error))
        } catch (error) {
            console.log("Rec --" + JSON.stringify(rec) + "-- not published to Pubsub" + error)
        }
    }
}

Sinks.kinesis = class kinesis {
    #kinesis;
    #streamname;
    constructor() {
        const { KinesisClient } = require("@aws-sdk/client-kinesis");
        this.#streamname = process.env.KINESIS_STREAM_NAME
        this.#kinesis = new KinesisClient({ region: process.env.KINESIS_REGION });
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
                if (!(process.env.SUPPRESS_SUCCESS_MESSAGE_LOG == 'Y'
                    || process.env.SUPPRESS_SUCCESS_MESSAGE_LOG == 'y'))
                    console.log("Message " + rec + " published to kinesis with result: " + JSON.stringify(data));
            })
                .catch((error) => {
                    console.log("Promise Error: Rec --" + JSON.stringify(rec) + "-- not published to kinesis " + error);
                });
        } catch (error) {
            console.log("Rec --" + JSON.stringify(rec) + "-- not published to kinesis " + error);
        }
    }
}

Sinks.eventshub = class EventsHub {
    #producer;
    constructor() {
        const { EventHubProducerClient } = require("@azure/event-hubs");
        this.#producer = new EventHubProducerClient(process.env.EVENT_HUB_CONN_STRING,
            process.env.EVENT_HUB_NAME);
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
                    console.log("Message " + rec + " published to azure events hub");
            })
            .catch((error) => {
                console.log("Record --" + rec + "-- not published to azure events hub: " + error);
            })

    }
}
// In memory sink for storing REF records
Sinks.memory = class memory {
    #mem;
    #removed_recs = []
    constructor() {
        this.#mem = []
    }
    write(rec) {
        this.#mem.push(rec)
    }
    get(i) {
        return this.#mem[i]
    }
    remove(i) {
        let rec = this.#mem.splice(i, 1);
        this.#removed_recs.push(rec);
        console.log(`Removed record:  + ${JSON.stringify(rec)}, sink has now ${this.#mem.length} records`);
    }
    length() {
        return this.#mem.length
    }
    checkIfColValueExists(colName, colValue) {
        return this.#mem.filter(rec => rec[colName] == colValue).length > 0
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
    #fs;
    #file;
    #max_records;
    #records_written = 0
    #enabledsinks
    constructor(file, max_records = 50000, enabledsinks) {
        this.#fs = require('fs');
        this.#file = file
        this.#max_records = max_records
        this.#enabledsinks = enabledsinks
    }
    // Remove sink from array enabledsinks
    disable() {
        this.#enabledsinks.splice(this.#enabledsinks.indexOf(this), 1)
    }

    write(rec) {
        try {
            JSON.parse(rec)
            if (this.#records_written < this.#max_records) {
                this.#records_written++
                this.#fs.appendFileSync(this.#file, rec + "\n");
            } else {
                console.log(`${this.#records_written} records written to file sink`);
                this.disable();
            }
        } catch (error) {
            if (this.#records_written < this.#max_records) {
                this.#records_written++
                this.#fs.appendFileSync(this.#file, JSON.stringify(rec) + "\n");
            } else {
                console.log(`${this.#records_written} records written to file sink`);
                this.disable();
            }
        }
    }
}

// Create kafka sink using kafkajs module
Sinks.kafka = class Kafka {
    #topic;
    #producer;
    constructor() {

        const { Kafka } = require('kafkajs')
        const kafka = new Kafka({
            clientId: 'generator-app',
            brokers: process.env.KAFKA_BROKERS.split(","),
            connectionTimeout: 5000,
            authenticationTimeout: 5000,
            reauthenticationThreshold: 20000,
            ssl: true,
            sasl: {
                mechanism: 'plain', 
                username: process.env.KAFKA_USERNAME,
                password: process.env.KAFKA_PASSWORD
             },
        });

        this.#producer = kafka.producer()
        this.#topic = process.env.KAFKA_TOPIC
    }
    init(enabledsinks) {
        console.log("Initializing kafka sink")
        this.#producer.connect()
        .then(() => {
            enabledsinks.push(this)
            console.log(`Kafka sink connected for topic ${this.#topic}`);
        })
        .catch((error) => {
            console.log(`Kafka sink not connected for topic ${this.#topic}: ${error}`);
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
            console.log(`Error sending record to kafka: ${error}`);
        })
    }
}

module.exports = { Sinks }