const fs = require('fs');
const yaml = require('js-yaml');
const { SINK_SCHEMA } = require('./sink_schema')
const { InvalidRecordSchema, SchemaNotFound, AlreadyExists } = require('./error_lib')
const { Sinks } = require('./sinks.js');
const { logger } = require('./logger');
const Validator = require('jsonschema').Validator;
const v = new Validator();


class Distributor {
    static getEnabledSinks() {
        if (Distributor.enabledSinks)
            return Distributor.enabledSinks
        else
            return Distributor.enabledSinks = []
    }

    static write(rec) {
        Distributor
            .getEnabledSinks()
            .filter(s => !(s.instance.status && s.instance.status == 'INACTIVE'))
            .forEach(sink => sink.instance.write(rec))
    }

    static createSink(config) {
        var sink = config
        var result = v.validate(config, SINK_SCHEMA, { nestedErrors: true })
        if (result.errors.length == 0) {
            sink.instance = new (Sinks[sink.config.type.toLowerCase()])(sink.config)
            Distributor.addSink(sink.name, sink.instance, sink.config)
        } else {
            throw new InvalidRecordSchema(result.toString())
        }
    }

    static addSink(name, instance, config = null) {
        if (Distributor.getSink(name)) {
            throw new AlreadyExists(`Sink ${name} already exists`)
        } else {
            var sink = {}
            sink.name = name
            sink.config = config
            sink.instance = instance
            Distributor.getEnabledSinks().push(sink);
        }
    }

    static getSink(sinkName) {
        var sinks = Distributor.getEnabledSinks()
        return sinks.find(sink => sink.name == sinkName)
    }

    static deleteSink(sinkName) {
        var sinks = Distributor.getEnabledSinks()
        var i = sinks.findIndex(sink => sink.name == sinkName)
        return sinks.splice(i, 1)
    }

    static deleteSinkWithInstance(instance) {
        var sinks = Distributor.getEnabledSinks()
        var i = sinks.findIndex(sink => sink.instance == instance)
        return sinks.splice(i, 1)
    }

    static getSinks() {
        return Distributor.getEnabledSinks()
            .map(sink => {
                let r = {}
                r.name = sink.name
                r.type = sink.instance.constructor.name
                return r
            })
    }

    static loadSinks() {
        try {
            var file_options = {
                encoding: 'utf8',
                flag: 'a+'
            }
            var contents = fs.readFileSync(global.options.sinkConfig, file_options);
            var sinkConfigs = yaml.load(contents);
            return sinkConfigs ? sinkConfigs.map(c => Distributor.createSink(c)) : []
        } catch (err) {
            logger.error(`Cannot load sinks from ${global.options.sinkConfig}: ${err}`)
        }
    }

    static saveSinks() {
        var yamldoc = yaml.dump(Distributor.getEnabledSinks()
            .map(sink => {
                return { "name": sink.name, "config": sink.config }
            }))
        fs.writeFileSync(global.options.sinkConfig, yamldoc)
    }

}

module.exports = { Distributor };