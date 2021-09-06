const { PubSub } = require('@google-cloud/pubsub');
const { KinesisClient, PutRecordCommand } = require("@aws-sdk/client-kinesis");

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
                Data: Buffer.from(rec),
                PartitionKey: rec[partkey],
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
module.exports = { Sinks }