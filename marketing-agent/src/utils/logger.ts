import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

export class Logger {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: { service: 'marketing-agent', context },
      transports: [
        new winston.transports.Console({
          format: consoleFormat,
        }),
      ],
    });

    // Add file transport if LOG_FILE is specified
    if (process.env.LOG_FILE) {
      this.logger.add(
        new winston.transports.File({
          filename: process.env.LOG_FILE,
          format: logFormat,
        })
      );
    }
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { ...meta, context: this.context });
  }

  error(message: string, error?: any): void {
    this.logger.error(message, {
      error: error?.message || error,
      stack: error?.stack,
      context: this.context,
    });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { ...meta, context: this.context });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, { ...meta, context: this.context });
  }
}
