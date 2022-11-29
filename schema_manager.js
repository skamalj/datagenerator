const fs = require('fs');
const yaml = require('js-yaml');
const { SOURCE_SCHEMA, REF_SCHEMA } = require('./rec_schemas')
const { InvalidRecordName,  InvalidRecordSchema, SchemaNotFound } = require('./error_lib')
const Validator = require('jsonschema').Validator;
const v = new Validator();

class SchemaManagerPrivate {

    constructor(schemafile) {
        var contents = fs.readFileSync(schemafile, 'utf8');
        var configdata = yaml.load(contents);
        if(configdata.hasOwnProperty("records"))
            for (const config of configdata.records) {
                if (config.hasOwnProperty("type") && config.type == "Ref") {
                    this.recordSchemas[config.name] = config;
                } else if (config.hasOwnProperty("type") && config.type == "Source") {
                    this.recordSchemas["Source"] = config;
                } else {
                    this.recordSchemas["Master"] = config;
                }
            }
        else 
            this.recordSchemas = configdata
    }

    getSchema(schema) {
        if (this.recordSchemas[schema])
            return this.recordSchemas[schema]
        else 
            throw new SchemaNotFound(`${schema} not found`)
    }

    deleteSchema(schema) {
        if (this.recordSchemas[schema]) {
            delete this.recordSchemas[schema]
            return this.recordSchemas
        }
        else 
            throw new SchemaNotFound(`${schema} not found`)
    }

    getSchemas() {
        return this.recordSchemas
    }

    addRefRecord(record) {
        var v = new Validator();
        var err = v.validate(record,REF_SCHEMA).errors
        var schema = Object.keys(record)[0]
        if(err.length == 0)
            if (schema.toUpperCase() == 'SOURCE' || schema.toUpperCase() == 'MASTER')
                throw new InvalidRecordName('Ref record name cannot be Source or Master')
            else 
                this.recordSchemas[schema] = record[schema]
        else 
            throw new InvalidRecordSchema(err)
    }

    addSourceRecord(record) {
        var v = new Validator();
        var err = v.validate(record,SOURCE_SCHEMA).errors
        var schema = Object.keys[0]
        if(err.length == 0)
            this.recordSchemas[schema] = record[schema]
        else 
            throw new InvalidRecordSchema(err)
    }
}

class SchemaManager {
    static getInstance(schemafile = null) {
        if (SchemaManager.instance)
            return SchemaManager.instance
        else 
            return SchemaManager.instance = new SchemaManagerPrivate(schemafile)
    }
}

module.exports = { SchemaManager}