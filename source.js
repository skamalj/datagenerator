// import generator
const { Generator } = require('./generator.js');
const { Sinks } = require('./sinks.js');

// This class creates a generator for a specific source
// If no sources are provided, dummy single source is created
// If source failure probability is configured, then a process is started to simulate source failure
// which disables randomly selected source.

class Source {
    constructor(options, enabledSinks, refDataGenerator) {
        this.options = options;
        this.enabledSinks = enabledSinks;
        this.refDataGenerator = refDataGenerator;
        this.sources = refDataGenerator.refRecords["Source"] ? refDataGenerator.refRecords["Source"] : new Sinks.memory();
        this.interval = parseInt(this.options.interval) || process.env.INTERVAL || 1000;
        this.initialize();
        this.startAll();
        if (this.refDataGenerator.recordSchemas["Source"] && this.refDataGenerator.recordSchemas["Source"].failure_simulation)
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
            Object.assign(o, this.sources.get(i));
            this.sources.get(i).data = o;
            this.sources.get(i).status = "Stopped";
        }
    }
    startSource(i) {
        let generator = new Generator(this.options, this.refDataGenerator.refRecords, this.refDataGenerator.recordSchemas,
            this.sources.get(i).data);
        let intervalId = setInterval(() => generator.genFakeRecord(this.enabledSinks, "Master"), this.interval);
        this.sources.get(i).intervalId = intervalId;
        this.sources.get(i).status = "Running";
        if (this.options.timeout)
            setTimeout(() => {
                clearInterval(intervalId)
            }, parseInt(this.options.timeout) * 60 * 1000);
    }
    startAll() {
        for (let i = 0; i < this.sources.length(); i++) {
            this.startSource(i);
        }
    }
    // This function can be used from management server to stop a source
    stopSource(i) {
        clearInterval(this.sources.get(i).intervalId);
        this.sources.get(i).status = "Stopped";
        console.log("Stopped source: " + JSON.stringify(this.sources.get(i).data) + " at index " + i);
    }
    // Get random Integer between min and max
    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        //The maximum is exclusive and the minimum is inclusive
        return Math.floor(Math.random() * (max - min)) + min;
    }
    // Get Running sources 
    // Can be used from management server to get running sources count
    getRunningSources() {
        let runningSources = 0;
        for (let i = 0; i < this.sources.length(); i++) {
            if (this.sources.get(i).status == "Running") {
                runningSources++;
            }
        }
        return runningSources;
    }
    // Simulate device/source failure
    randomlyRemoveSources() {
        let removalProbability = this.refDataGenerator.recordSchemas["Source"].failure_simulation.probability ?
            this.refDataGenerator.recordSchemas["Source"].failure_simulation.probability * 100.0 : 0;
        let min_source_recs = this.refDataGenerator.recordSchemas["Source"].failure_simulation.min_source_recs ?
            this.refDataGenerator.recordSchemas["Source"].failure_simulation.min_source_recs : this.sources.length();
        for (let i = 0; i < this.sources.length(); i++) {
            if (this.getRandomInt(1, 10001) <= removalProbability
                && this.getRunningSources() > min_source_recs
                && this.sources.get(i).status == "Running") {
                this.stopSource(i);
            }
        }
    }
}
module.exports = { Source };
