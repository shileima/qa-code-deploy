// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv-flow').config();

const { Application } = require('egg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const adapter = require('@fdfe/ecf-http-adapter');

const app = new Application({
    baseDir: __dirname,
    mode: 'single'
});

export const main = adapter(app, {
    injectLogger: true,
    injectCat: true
})
