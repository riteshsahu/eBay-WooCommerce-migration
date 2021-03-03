const path = require("path");
const winston = require("winston");

const options = {
  file: {
    level: "info",
    filename: path.join(__dirname, "../logs/info_log.log"),
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
};

const logger = new winston.createLogger({
  transports: [new winston.transports.File(options.file)],
  exitOnError: false, // do not exit on handled exceptions
});

logger.stream = {
  write: function (message, encoding) {
    logger.info(message);
  },
};

export default logger;
