const { Sinks } = require('./sinks.js');
const { Distributor } = require('./distributor')
const { logger } = require('./logger')
const { NotFound} = require('./error_lib')

// This class creates a generator for a specific source
// If no sources are provided, dummy single source is created
// If source failure probability is configured, then a process is started to simulate source failure
// which disables randomly selected source.

class SourcePrivate {
    constructor(options) {
        this.options = options;
        var refRecords = global.generator.getRefRecords();
        var recordSchemas = global.schemaManager.getSchemas();
        this.sources = refRecords["Source"] ? refRecords["Source"] : new Sinks.memory();
        this.interval = parseInt(this.options.interval) || process.env.INTERVAL || 1000;
        this.initialize();
        this.startAll();
        if (recordSchemas["Source"] && recordSchemas["Source"].failure_simulation)
            setInterval(() => this.randomlyRemoveSources(), this.interval);
    }
    // Move source attributes to 'data' field, so that we can add other attributes to source 
    // like status and processID
    initialize() {
        if (this.sources.length() == 0) {
            this.sources.write({});
        }
        for (let i = 0; i < this.sources.length(); i++) {
            let o = {}
            o.data = JSON.parse(JSON.stringify(this.sources.get(i)));            
            o.status = "Stopped";
            o.id = i;
            (this.sources.get())[i] = JSON.parse(JSON.stringify(o));
        }
    }
    startSource(i) {
        let intervalId = setInterval(() => global.generator.genFakeRecord([Distributor], "Master", 
                                this.getSource(i).data), this.interval);
        this.getSource(i).intervalId = intervalId;
        this.getSource(i).status = "Running";
        if (this.options.timeout)
            setTimeout(() => {
                clearInterval(intervalId)
            }, parseInt(this.options.timeout) * 60 * 1000);
        var source = this.getSource(i)
        return  {"id": source.id, "data": source.data, "status": source.status} 
    }

    startAll() {
        for (let i = 0; i < this.sources.length(); i++) {
            this.startSource(i);
        }
    }
    stopAll() {
        for (let i = 0; i < this.sources.length(); i++) {
            this.stopSource(i);
        }
    }
    reStartAll() {
        for (let i = 0; i < this.sources.length(); i++) {
            this.stopSource(i);
            this.startSource(i);
        }
    }
    // Reset interval and restart all sources
    resetInterval(interval) {
        this.interval = interval;
        this.reStartAll();
    }
    // This function can be used from management server to stop a source
    stopSource(i) {
        clearInterval(this.getSource(i).intervalId);
        this.getSource(i).status = "Stopped";
        logger.info("Stopped source: " + JSON.stringify(this.getSource(i).data) + " at index " + i);
        var source =  this.getSource(i)
        return  {"id": source.id, "data": source.data, "status": source.status} 
    }
    // Get random Integer between min and max
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        //The maximum is exclusive and the minimum is inclusive
        return Math.floor(Math.random() * (max - min)) + min;
    }

    getSource(i) {
        var source = this.sources.get(i)
        if (source) 
            return source
        else 
            throw new NotFound(`Source ${i} not found`)
    }
    // Get Running sources 
    // Can be used from management server to get running sources count
    getSources(state = null) {
        let r = this
                .sources
                .get()
                .filter(source => !(state) || source.status == state)
                .map(source => { return {"id": source.id, "data": source.data, "status": source.status}})
        return r
    }

    // Simulate device/source failure
    randomlyRemoveSources() {
        var recordSchemas = global.schemaManager.getSchemas();
        let removalProbability = recordSchemas["Source"].failure_simulation.probability ?
            recordSchemas["Source"].failure_simulation.probability * 100.0 : 0;
        let min_source_recs = recordSchemas["Source"].failure_simulation.min_source_recs ?
            recordSchemas["Source"].failure_simulation.min_source_recs : this.sources.length();
        for (let i = 0; i < this.sources.length(); i++) {
            var s = this.sources.get(i).status
            if (this.getRandomInt(1, 10001) <= removalProbability
                && this.getSources().length > min_source_recs
                && this.getSource(i).status == "Running") {
                this.stopSource(i);
            }
        }
    }
}

class Source {
    static getInstance(options = null) {
        if (Source.instance)
            return Source.instance
        else 
            return Source.instance = new SourcePrivate(options)
    }
}

module.exports = { Source };
