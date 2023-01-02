const express = require('express')
var bodyParser = require('body-parser')
const { httpLogger } = require('./logger')
const { SchemaManager } = require('./schema_manager')
const { Source } = require('./source.js');
const { Distributor } = require('./distributor.js');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const yaml = require('js-yaml');
const {SINK_SCHEMA} = require('./openapi_sink_schema')
const {eventEmitter} = require('./eventhandler')


const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8'));
swaggerDocument.components = {}
swaggerDocument.components.schemas = SINK_SCHEMA.schemas

const app = express()
app.use(httpLogger)
var mockRouter = express.Router()
var configRouter = express.Router()
var sourceRouter = express.Router()
var sinkRouter = express.Router()
const openapiRouter = express.Router();

openapiRouter.use('/', swaggerUi.serve);
openapiRouter.get('/', swaggerUi.setup(swaggerDocument));

app.use("/mock", mockRouter)
app.use("/schema", configRouter)
app.use("/source", sourceRouter)
app.use("/sink", sinkRouter)
app.use("/api-docs", openapiRouter)

app.use((err, req, res, next) => {
    console.error(err)
    res.status(err.statusCode).send({
        'err': 500,
        'message': err.message
    })
})
app.listen(3000, () => {
    console.log(`API Server listening on port 3000`)
})

function createAPIMocker() {
    console.log('Creating/Updating API Mocker)')
    var refData = global.generator.getRefRecords()
    var recordSchemas = global.schemaManager.getSchemas()
    mockRouter.use(bodyParser.json())
    for (let schema in recordSchemas) {
        if (schema != "Master" && schema != "Source") {
            for (let col of recordSchemas[schema].schema) {
                mockRouter.get(`/${schema}/:id`, (req, res) => {
                    data = refData[schema].getElementByValue(col.name, req.params.id)
                    if (data.length > 0)
                        res.send(data[0])
                    else
                        res.status(404).send(`/${schema}/${req.params.id} NOT FOUND`)
                })
                mockRouter.delete(`/${schema}/:id`, (req, res) => {
                    data = refData[schema].removeElementByValue(col.name, req.params.id)
                    if (data.length > 0)
                        res.send(data[0])
                    else
                        res.status(404).send(`/${schema}/${req.params.id} NOT FOUND`)
                })
                break
            }
            mockRouter.get(`/${schema}`, (req, res) => {
                res.send(refData[schema].get())
            })
            mockRouter.post(`/${schema}`, (req, res) => {
                res.send(refData[schema].write(req.body))
            })
        }
    }
}

function createConfigManagerAPI() {
    const schemaManager = SchemaManager.getInstance()
    configRouter.use(bodyParser.json())
    configRouter.get('/:schema', (req, res) => {
        res.send(schemaManager.getSchema(req.params.schema))
    })
    configRouter.get('/', (req, res) => {
        res.send(schemaManager.getSchemas())
    })
    configRouter.delete('/:schema', (req, res) => {
        res.send(schemaManager.deleteSchema(req.params.schema))
    })
    configRouter.post('/', (req, res) => {
        record = req.body
        switch (Object.keys(record)[0]) {
            case 'Source':
                schemaManager.addSourceRecord(record)
                break;
            case 'Master':
                break;
            default:
                schemaManager.addRefRecord(record)
        }
        res.send(schemaManager.getSchemas())
    })
}

function createSourceAPI() {
    const source = Source.getInstance()
    sourceRouter.use(bodyParser.json())
    sourceRouter.get('/', (req, res) => {
        res.send(source.getSources())
    })
    sourceRouter.post('/interval/:interval', (req, res) => {
        res.send(source.resetInterval(req.params.interval))
    })
    sourceRouter.post('/:action', (req, res) => {
        switch (req.params.action) {
            case 'start':
                source.startAll()
                res.send()
                break;
            case 'stop':
                source.stopAll()
                res.send()
                break;
            default:
                res.status(404).send()
        }
    })
    sourceRouter.get('/:state', (req, res) => {
        res.send(source.getSources(req.params.state))
    })
    sourceRouter.post('/:action/:id', (req, res) => {
        let s
        switch (req.params.action) {
            case 'start':
                s = source.startSource(req.params.id)
                res.send(s)
                break;
            case 'stop':
                s = source.stopSource(req.params.id)
                res.send(s)
                break;
            default:
                res.status(404).send()
        }
    })
}

function createSinkAPI() {
    sinkRouter.use(bodyParser.json())
    sinkRouter.get('/', (req, res) => {
        res.send(Distributor.getSinks())
    })
    sinkRouter.get('/:name', (req, res) => {
        let s = Distributor.getSink(req.params.name)
        if (s)
            res.send(s)
        else 
            res.status(404).send()
    })
    sinkRouter.delete('/:name', (req, res) => {
        let s = Distributor.deleteSink(req.params.name)
        if (s)
            res.send(s)
        else 
            res.status(404).send()
    })
    sinkRouter.post('/', (req, res) => {
        res.send(Distributor.createSink(req.body))
    })

}

module.exports = { createAPIMocker, createConfigManagerAPI, createSourceAPI, createSinkAPI};