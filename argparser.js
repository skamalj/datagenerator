const { Command } = require('commander');
const program = new Command();

program
  .option('-i, --interval <interval>', 'Interval in milliseconds between records')
  .option('-t, --timeout <timeout>', 'Timeout in minutes for generator')

  module.exports = { program }