const express = require('express')
var bodyParser = require('body-parser')
const { SchemaManager } = require('./schema_manager')
const {RefDataGenerator } = require('./generator.js');
const { Source } = require('./source.js');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const yaml = require('js-yaml');

const swaggerDocument = yaml.load(fs.readFileSync('./swagger.json', 'utf8'));

const app = express()
var mockRouter = express.Router()
var configRouter = express.Router()
var sourceRouter = express.Router()
const openapiRouter = express.Router();

openapiRouter.use('/', swaggerUi.serve);
openapiRouter.get('/', swaggerUi.setup(swaggerDocument));

app.use("/mock", mockRouter)
app.use("/schema", configRouter)
app.use("/source", sourceRouter)
app.use("/api-docs", openapiRouter)

app.use((err, req, res, next) => {
    console.error(err)
    res.status(err.statusCode).send({
        'err': err.code,
        'message':err.message
    })
  })
app.listen(3000, () => {
    console.log(`API Server listening on port 3000`)
})

function createAPIMocker(refData, recordSchemas) {
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
        switch(Object.keys(record)[0]) {
            case 'Source':
                schemaManager.addSourceRecord(record)
                break;
            case 'Master':
                break;
            default:
                var refDataGenerator = RefDataGenerator.getInstance()
                schemaManager.addRefRecord(record)
                refDataGenerator.generateRefRecordsForSchema(Object.keys(record)[0])
                createAPIMocker(refDataGenerator.refRecords, refDataGenerator.recordSchemas)
        }
        res.send(schemaManager.getSchemas())
    })
}

function createSourceAPI() {
    const source = Source.getInstance()
    sourceRouter.use(bodyParser.json())
    sourceRouter.get('/',(req,res) => {
        res.send(source.getRunningSources() )
    })
    sourceRouter.post('/interval/:interval',(req,res) => {
        res.send(source.resetInterval(req.params.interval) )
    })
    sourceRouter.post('/:state', (req, res) => {
            switch(req.params.state) {
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
    sourceRouter.post('/:state/:id', (req, res) => {
        switch(req.params.state) {
            case 'start':
                source.startSource(req.params.id)
                res.send()
                break;
            case 'stop':
                source.stopSource(req.params.id)
                res.send()
                break;
            default:
                res.status(404).send()
        }
})
}

module.exports = { createAPIMocker, createConfigManagerAPI, createSourceAPI };