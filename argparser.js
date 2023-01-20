const { Command } = require('commander');
const parser = new Command();

// Options can be used in the code as 'options.port'
const options = parser
  .option('-i, --interval <interval>', 'Interval in milliseconds between records', 1000)
  .option('-t, --timeout <timeout>', 'Timeout in minutes for generator')
  .option('-e, --no-event-time', 'Flag to disable adding event time to records')
  .option('-p, --port <port>', 'Specify port for tcp server', 4000)
  .option('-a, --api-port <port>', 'Specify port for api server', 3000)
  .option('-c, --csv', 'Create csv formatted records')
  .option('-d, --debug', 'Enable debug')
  .option('-s, --sources <no-of-sourcers>','Specifiy number of dummy sources',0)
  .option('-n, --no-start','Specify this switch to create sources in stop state')
  .option('-f, --schemafile <schemafile>', 'Specify schema config file', "resources/generator/config.yaml")
  .option('-k, --sink-config <file>', 'Specify sink config file','resources/config/sink.yaml')
  .parse(process.argv)
  .opts()

  module.exports = { options }