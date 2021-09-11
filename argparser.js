const { Command } = require('commander');
const program = new Command();

program
  .option('-i, --interval <interval>', 'Interval in milliseconds between records')
  .option('-t, --timeout <timeout>', 'Timeout in minutes for generator')
  .option('-n, --noeventtime', 'Flag to disable adding event time to records')
  .option('-p, --port <port>', 'Specify port for tcp server, default is 4000')
  .option('-c, --csv', 'Create csv formatted records')

  module.exports = { program }