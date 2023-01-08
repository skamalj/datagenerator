const { Sinks } = require('./sinks.js');
const { Distributor } = require('./distributor')
const { logger } = require('./logger')
const { NotFound} = require('./error_lib')

// This class generates data for a given source. It uses global Generator instance 
// to create data records.

class SourcePrivate {
    constructor(options) {
        this.options = options;
        var refRecords = global.generator.getRefRecords();
        var recordSchemas = global.schemaManager.getSchemas();
        this.sourceData = refRecords["Source"] ? refRecords["Source"] : new Sinks.memory();
        this.sources = new Sinks.memory();
        this.sourceIntervalIds = {}
        this.interval = parseInt(this.options.interval) || process.env.INTERVAL || 1000;
        this.initialize();
        this.startAll();
        if (recordSchemas["Source"] && recordSchemas["Source"].failure_simulation)
            setInterval(() => this.randomlyRemoveSources(), this.interval);
    }
    // This creates source objects (data, status and id) from source data records
    initialize() {
        if (this.sourceData.length() == 0) {
            this.sourceData.write({});
        }
        for (let i = 0; i < this.sourceData.length(); i++) {
            let o = {}
            o.data = {...this.sourceData.get(i)};            
            o.status = "Stopped";
            o.id = i;
            this.sources.write(o)
        }
    }
    startSource(i) {
        let intervalId = setInterval(() => global.generator.genFakeRecord([Distributor], "Master", 
                                this.getSource(i).data), this.interval);
        this.sourceIntervalIds.i = intervalId;
        this.getSource(i).status = "Running";
        if (this.options.timeout)
            setTimeout(() => {
                clearInterval(intervalId)
            }, parseInt(this.options.timeout) * 60 * 1000);
        var source = this.getSource(i)
        return source
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
    
    resetInterval(interval) {
        this.interval = interval;
        this.reStartAll();
    }

    stopSource(i) {
        clearInterval(this.sourceIntervalIds.i.intervalId);
        this.getSource(i).status = "Stopped";
        logger.info("Stopped source: " + JSON.stringify(this.getSource(i).data) + " at index " + i);
        var source =  this.getSource(i)
        return  source
    }
    // Get random Integer between min and max. This is used to randomly stop sources, if enabled
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
    
    getSources(state = null) {
        let r = this
                .sources
                .get()
                .filter(source => !(state) || source.status == state)
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
