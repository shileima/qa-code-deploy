const stream = require('stream');
const path = require('path');

module.exports = (_, __) => {
    /**
   * 初始化 Cat SDK 实例，并挂载 ctx.cat 和 ctx.transaction
   * @param {Era.Context} ctx
   * @param {Era.Next} next
   */
    return async (ctx, next) => {
        const t = ctx.cat.newTransaction('RequestTracing');
        t.addData('traceId', ctx.traceId);
        ctx.transaction = t;
        await next();
        const isStream = ctx.body instanceof stream.Stream;
        if (isStream) {
            ctx.body.on('end', () => {
                ctx.cat.complete();
            });
            ctx.body.on('error', () => {
                ctx.cat.complete();
            });
        } else {
            ctx.cat.complete();
        }
    };
};
