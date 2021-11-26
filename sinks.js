const { PubSub } = require('@google-cloud/pubsub');
const { KinesisClient, PutRecordCommand } = require("@aws-sdk/client-kinesis");
const { EventHubProducerClient } = require("@azure/event-hubs");

let Sinks = {}

Sinks.pubsub = class pubsub {
    #pubsub;
    constructor() {
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
        this.#streamname = process.env.KINESIS_STREAM_NAME
        this.#kinesis = new KinesisClient({ region: process.env.KINESIS_REGION });
    }
    write(rec) {
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
    constructor() {
        this.#mem = []
    }
    write(rec) {
        this.#mem.push(rec)
    }
    get(i) {
        return this.#mem[i]
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
        this.#con.write(JSON.stringify(rec) + "\n");
    }
}
module.exports = { Sinks }