const { createAPIMocker } = require('./api.js')

function registerListeners(e) {
  e.on('refschemaadded', schema => {
      updateRefRecords(schema)
    });
}

function updateRefRecords(schema) {
    console.log(`Ref schema ${schema} added`)
    var dataGenerator = global.generator
    dataGenerator.generateRefRecordsForSchema(Object.keys(record)[0])
    createAPIMocker()
}

module.exports = { registerListeners }