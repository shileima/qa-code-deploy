const log4js = require('log4js');
const lutil = require('util');

const inLocalRuntime = !(process.env.NEST_FUNCTION_APPKEY);

// 在 Nest 真实机器上不带彩色, 在本地带上彩色
const appLogPattern = inLocalRuntime ? '%[%d %p %c [traceId=%X{traceId}]%] %m' : '%d %p %c [traceId=%X{traceId}] %m';

// 在 Nest 真实机器上不再输出到日志文件，在本地输出到 logs/all.log 方便追溯日志
const appLogAppenders = inLocalRuntime ? ['appLogConsoleOut', 'logFile'] : ['appLogConsoleOut'];

// see: https://log4js-node.github.io/log4js-node/layouts.html
log4js.configure({
    disableClustering: true,
    appenders: {
        defaultOut: {
            type: 'console',
            layout: {
                type: 'colored'
            }
        },
        logFile: {
            type: 'dateFile',
            filename: 'logs/all.log'
        },
        appLogConsoleOut: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: appLogPattern
            }
        }
    },
    categories: {
        default: {
            appenders: ['defaultOut', 'logFile'],
            level: 'debug'
        },
        'server-app': {
            appenders: appLogAppenders,
            level: 'debug'
        },
        spapi: {
            appenders: appLogAppenders,
            level: 'debug'
        },
        sequelize: {
            appenders: appLogAppenders,
            level: 'debug'
        },
        jest: {
            appenders: ['defaultOut', 'logFile'],
            level: 'debug'
        }
    }
});

const appLogger = () => {
    const logger = log4js.getLogger('server-app');
    logger.level = 'debug';
    return logger;
};

const spapiLogger = () => {
    const logger = log4js.getLogger('spapi');
    logger.level = 'debug';
    return logger;
};

const sequelizeLogger = () => {
    const logger = log4js.getLogger('sequelize');
    return logger;
};

const jestLogger = () => {
    const logger = log4js.getLogger('jest');
    return logger;
};

const formatSequelizeArgs = (args) => {
    const [first, ...rest] = args;
    const restLogFormat = Array.from({ length: rest.length }).map(_ => '%j').join(' ');
    const logFormat = '%s ' + restLogFormat;
    return lutil.format(logFormat, first, ...rest);
};

module.exports = {
    appLogger,
    spapiLogger,
    sequelizeLogger,
    jestLogger,
    formatSequelizeArgs
};
