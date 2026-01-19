require('dotenv-flow').config();
require('module-alias/register');

module.exports = app => {
    app.beforeStart(async () => {
        require('dotenv-flow').config();
    });
};
