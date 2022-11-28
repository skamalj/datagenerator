const express = require('express')
var bodyParser = require('body-parser')
const { SchemaManager } = require('./schema_manager')

const app = express()
var mockRouter = express.Router()
var configRouter = express.Router()
app.use("/mock", mockRouter)
app.use("/schema", configRouter)
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
                    res.send(refData[schema].removeElementByValue(col.name, req.params.id))
                })
                break
            }
            mockRouter.get(`/${schema}`, (req, res) => {
                res.send(refData[schema].get())
            })
            mockRouter.post(`/${schema}`, (req, res) => {
                console.log(req.body)
                res.send(refData[schema].write(req.body))
            })
        }
    }
}

function createConfigManagerAPI(schemafile) {
    const schemaManager = SchemaManager.createInstance(schemafile)
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
        console.log(Object.keys(record)[0])
        switch(Object.keys(record)[0]) {
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

module.exports = { createAPIMocker, createConfigManagerAPI };