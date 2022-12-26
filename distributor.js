const fs = require('fs');
const yaml = require('js-yaml');
const { SINK_SCHEMA } = require('./sink_schema')
const { InvalidRecordSchema, SchemaNotFound } = require('./error_lib')
const { Sinks } = require('./sinks.js');
const Validator = require('jsonschema').Validator;
const v = new Validator();


class Distributor {
    static getEnabledSinks() {
        if (Distributor.enabledSinks)
            return Distributor.enabledSinks
        else
            return Distributor.enabledSinks = []
    }

    static addSink(config) {
        var sink = config
        var result = v.validate(config, SINK_SCHEMA, { nestedErrors: true })
        if (result.errors.length == 0) {
            sink.instance = new (Sinks[sink.config.type.toLowerCase()])(sink.config)
            Distributor.getEnabledSinks().push(sink);
        } else {
            throw new InvalidRecordSchema(result.toString())
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

    static getSinks() {
        return Distributor.getEnabledSinks()
            .map(sink => {
                let r = {}
                r.name = sink.name
                r.type = sink.instance.constructor.name
                return r
            })
    }

    static loadSinks(sinkConfigFile) {
        var contents = fs.readFileSync(sinkConfigFile, 'utf8');
        var sinkConfigs = yaml.load(contents);
        sinkConfigs.map(c => Distributor.addSink(c))
    }

    static saveSinkConfigs(sinkConfigFile) {
        var yamldoc = yaml.dump(Distributor.getEnabledSinks()
            .map(sink => sink.config))
        fs.writeFileSync(sinkConfigFile, yamldoc)
    }

}

module.exports = { Distributor };