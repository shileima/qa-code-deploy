'use strict';

module.exports = (_, app) => {
    /**
   * @param {Era.Context} ctx
   * @param {Era.Next} next
   */
    return async function errorHandler (ctx, next) {
        try {
            await next();
            ctx.transaction.setName(ctx.routerName || `UNKNOWN_ROUTE:${ctx.method}:${ctx.path}`);
            ctx.transaction.setStatus(ctx.cat.STATUS.SUCCESS);
            ctx.transaction.complete();
        } catch (err: any) {
            // 有任何抛出来的异常，先在这里打印出来
            ctx.appLogger.error('[ERROR_HANDLER]', err);
            ctx.cat.logError('[ERROR_HANDLER]', err);
            try {
                ctx.transaction.setName(ctx.routerName || `UNKNOWN_ROUTE:${ctx.method}:${ctx.path}`);
                ctx.transaction.addData('status', err.status || 500);
                ctx.transaction.addData('code', err.code);
                ctx.transaction.logError((err && err.name) || 'UnkownErrorName', err);

                // 如果 status 等于 20x,30x,40x 则不抛出异常, 否则告警太多了噪音太大
                const status = parseInt(err.status, 10);
                if (!isNaN(status) && err.status < 500) {
                    ctx.transaction.setStatus(ctx.cat.STATUS.SUCCESS);
                } else {
                    ctx.transaction.setStatus(ctx.cat.STATUS.FAIL);
                }
            } catch (error) {
                ctx.appLogger.error('cat-report-error', error);
                ctx.cat.logError('cat-report-error', err);
            }

            // 框架会统一监听，并打印对应的错误日志 - by era
            ctx.app.emit('error', err, app);

            const { status = 500, expose = true, message, code = -1, data = null } = err;

            const msg = expose ? message : 'Internal Server Error';

            ctx.status = status;
            ctx.type = 'json';
            ctx.body = {
                code,
                message: msg,
                data
            };
        }
    };
};
