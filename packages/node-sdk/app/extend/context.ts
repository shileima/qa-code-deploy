'use strict';

/** @type {import('axios').default */

const axios = require('axios');

const AX_INSTANCE = Symbol('Context#AX_INSTANCE');

const retryUtil = require('../utils/retry');

/**
 * @type {import('@era/node').Context}
 */
module.exports = {
    get mTraceId () {
        return this.traceId;
    },
    get axios () {
        if (!this[AX_INSTANCE]) {
            const instance = axios.create();
            this[AX_INSTANCE] = instance;
        }
        return this[AX_INSTANCE];
    },
    success (data, { status = 200, type = 'json' } = {}) {
        if (data == null) {
            this.body = this.body || '';
        } else {
            this.type = type;
            this.status = status;
            this.body = data;
        }
    },
    retry (func, options) {
        return retryUtil(func, {
            action: options.action,
            logger: options.logger || this.logger,
            operationOptions: options.operationOptions,
            when: options.when
        });
    },
};
