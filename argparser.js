const { Command } = require('commander');
const parser = new Command();

// Options can be used in the code as 'options.port'
const options = parser
  .option('-i, --interval <interval>', 'Interval in milliseconds between records', 1000)
  .option('-t, --timeout <timeout>', 'Timeout in minutes for generator')
  .option('-n, --noeventtime', 'Flag to disable adding event time to records')
  .option('-p, --port <port>', 'Specify port for tcp server', 4000)
  .option('-a, --api-port <port>', 'Specify port for api server', 3000)
  .option('-c, --csv', 'Create csv formatted records')
  .option('-d, --debug', 'Enable debug')
  .option('-s, --schemafile <schemafile>', 'Specify schema config file', "./schema/config.yaml")
  .option('-k, --sink-config <file>', 'Specify sink config file','resources/config/sink.yaml')
  .parse(process.argv)
  .opts()

  module.exports = { options }