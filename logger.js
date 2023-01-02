const { options } = require('./argparser.js');
const {createLogger, format, transports } = require('winston');
var morgan = require('morgan')

const logger = createLogger({
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
      new transports.Console({ level: options.debug ? 'debug' : 'info' }),
    ]
  });

const httpLogger = morgan(function (tokens, req, res) {
    return JSON.stringify({
      "method": tokens.method(req, res),
      "url": tokens.url(req, res),
      "status": tokens.status(req, res),
      "res" : tokens.res(req, res, 'content-length'),
      "response-time-ms": tokens['response-time'](req, res)
    })
  })

  module.exports = { logger, httpLogger}