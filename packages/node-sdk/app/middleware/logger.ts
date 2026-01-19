'use strict';
const logger = require('../utils/logger');

module.exports = (_, __) => {
    /**
   * @param {Era.Context} ctx
   * @param {Era.Next} next
   */
    return async function (ctx, next) {
        ctx.appLogger = logger.appLogger();
        ctx.spapiLogger = logger.spapiLogger();
        ctx.sequelizeLogger = logger.sequelizeLogger();
        await next();
    };
};