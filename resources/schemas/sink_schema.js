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
                { "$ref": "#/$defs/webhook" },
                { "$ref": "#/$defs/kafka" },
                { "$ref": "#/$defs/awsiot" },
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
        "webhook": {
            "type": "object",
            "required": ["type","url"],
            "additionalProperties": false,
            "properties": {
                "type": { "const": "webhook" },
                "url": { "type": "string" },
                "options": { "type": "object" },
            }
        },
        "awsiot": {
            "type": "object",
            "required": ["type", "host_name", "topic","client_id","cert_filepath","key_filepath"],
            "additionalProperties": false,
            "properties": {
                "type": { "const": "AWSIoT" },
                "host_name": { "type": "string" },
                "topic": { "type": "string" },
                "client_id": { "type": "string" },
                "cert_filepath": { "type": "string" },
                "key_filepath": { "type": "string" },
                "ca_filepath": { "type": "string" }
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

//const Validator = require('jsonschema').Validator;
//const v = new Validator();
//var instance = {
//    "name": "sinkOne",
//    "config": {
//        "type": "AWSIoT",
//        "key_filepath": "/home/kamal/dev/greengrass/node-pub/4e0e8ad6f2f7fa1678c6dec53050aa90bea63a4f05e18b16e14b988b961d46bd-private.pem.key",
//        "cert_filepath": "/home/kamal/dev/greengrass/node-pub/4e0e8ad6f2f7fa1678c6dec53050aa90bea63a4f05e18b16e14b988b961d46bd-certificate.pem.crt",
//        "host_name": "13.233.245.141",
//        "client_id": "GGClient2",
//        "topic": "test-gg",
//    }
//};
//console.log(v.validate(instance, SINK_SCHEMA, {nestedErrors: true}).toString());

module.exports = { SINK_SCHEMA }