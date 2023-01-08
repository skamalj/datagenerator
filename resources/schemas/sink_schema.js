const SINK_SCHEMA = {
    "$id": "generatorSink",
    "title": "Sink",
    "description": "A data sink for fibber",
    "type": "object",
    "required": ["name", "config"],
    "additionalProperties": false,
    "properties": {
        "name": {
            "description": "Unique sink name",
            "type": "string"
        },
        "config": {
            "oneOf": [
                { "$ref": "#/$defs/pubsub" },
                { "$ref": "#/$defs/kinesis" },
                { "$ref": "#/$defs/eventshub" },
                { "$ref": "#/$defs/file" },
            ]
        }
    },
    "$defs": {
        "pubsub": {
            "type": "object",
            "required": ["type", "projectId", "topic"],
            "additionalProperties": false,
            "properties": {
                "type": { "const": "PubSub" },
                "projectId": { "type": "string" },
                "topic": { "type": "string" }
            }
        },
        "kinesis": {
            "type": "object",
            "required": ["type", "streamName", "region"],
            "additionalProperties": false,
            "properties": {
                "type": { "const": "Kinesis" },
                "streamName": { "type": "string" },
                "region": { "type": "string" }
            }
        },
        "eventshub": {
            "type": "object",
            "required": ["type", "eventshubConnectionString", "eventshubName"],
            "additionalProperties": false,
            "properties": {
                "type": { "const": "EventsHub" },
                "eventshubConnectionString": { "type": "string" },
                "eventshubName": { "type": "string" }
            }
        },
        "kafka": {
            "type": "object",
            "required": ["type", "brokers", "topicName"],
            "additionalProperties": false,
            "properties": {
                "type": { "const": "Kafka" },
                "brokers": { "type": "string" },
                "topicName": { "type": "string" },
                "saslUsername": { "type": "string" },
                "saslPassword": { "type": "string" }
            }
        },
        "file": {
            "type": "object",
            "required": ["type", "baseName"],
            "additionalProperties": false,
            "properties": {
                "type": { "const": "FileSink" },
                "baseName": {"type": "string"},
                "batchSize": { "type": "integer", "default": 5000 },
                "numOfFiles": { "type": "integer", "default": 5 },
                "destination": { "type": "string", "default": "Local" },
                "s3BucketName": { "type": "string" },
            },
            "if": {
                "properties": {"destination" : {"const": "S3"}},
                "required": ["destination"]
            },
            "then": {
                "required": ["type", "s3BucketName"],    
            }
        }
    }
}

// const Validator = require('jsonschema').Validator;
// const v = new Validator();
// var instance = {
//     "name": "sinkOne",
//     "config": {
//         "type": "File",
//         "destination": "S3"
//     }
// };
// console.log(v.validate(instance, SINK_SCHEMA, {nestedErrors: true}).toString());

module.exports = { SINK_SCHEMA }