const retryLib = require('retry');
const VError = require('verror');

/**
 * 最大耗时:
 * - 4,500,2: t0+500ms, +t1+1000ms, +t2+2000ms, +t3+4000ms, +t4 === t0+t1+t2+t3+t4+7500ms
 * - 3,300,3: t0+300ms, +t1+900ms, t2+2700ms, +t3 === t0+t1+t2+t3+3900ms
 * - 3,300,2: t0+300ms, +t1+600ms, t2+1200ms, +t3 === t0+t1+t2+t3+2100ms
 */
const defaultOperationOptions = {
    retries: 4,
    minTimeout: 500,
    factor: 2
};

/**
 * 默认 retry 操作，封装了默认的重试选项和日志打印功能的 retry 函数
 * @param {(): Promise<T>} func
 * @param {{ action: string; logger: any; operationOptions: import('retry').OperationOptions; when: (error: Error) => boolean}} options
 * @returns {T}
 */
const retry = (func, options) => {
    const {
        action = 'default-action',
        logger = console,
        operationOptions = defaultOperationOptions,
        when = () => true
    } = options;

    const operation = retryLib.operation(operationOptions);

    const startTime = new Date();

    const p = new Promise((resolve, reject) => {
        operation.attempt((currentAttempt) => {
            const logsuffix = `[retry-util] action:${action} attempt:${currentAttempt}`;
            logger.debug(`${logsuffix} begin`);

            func.apply().then(result => {
                logger.debug(`${logsuffix} succeeded`);
                logger.info(`[retry-util] action:${action} succeeded at #${currentAttempt} try, duration: ${new Date().getTime() - startTime.getTime()}ms`);
                resolve(result);
            }).catch(currentError => {
                logger.debug(`${logsuffix} failed`);

                const retryNeeded = when(currentError);

                if (!retryNeeded) {
                    logger.debug(`${logsuffix} aborted, reason: retry condition not satisfied`);
                    operation.stop();
                    const errors = operation.errors();
                    const mainError = operation.mainError();
                    logger.info(`[retry-util] action:${action} failed at #${currentAttempt} try, duration: ${new Date().getTime() - startTime.getTime()}ms`);
                    const verror = new VError({
                        name: 'OperationAbortError',
                        cause: currentError,
                        info: { errors, mainError }
                    }, 'Operation `%s` failed after %s attempts', action, currentAttempt);
                    reject(verror);
                    return;
                }

                if (retryNeeded && operation.retry(currentError)) {
                    logger.debug(`${logsuffix} continue`);
                } else {
                    const errors = operation.errors();
                    const mainError = operation.mainError();
                    logger.info(`[retry-util] action:${action} failed at #${currentAttempt} try, duration: ${new Date().getTime() - startTime.getTime()}ms`);
                    const verror = new VError({
                        name: 'MaximiumRetriesReachedError',
                        cause: currentError,
                        info: { errors, mainError }
                    }, 'Operation `%s` failed after %s attempts, duration: %sms', action, currentAttempt, new Date().getTime() - startTime.getTime());
                    reject(verror);
                }
            });
        });
    });

    return p;
};

module.exports = retry;
