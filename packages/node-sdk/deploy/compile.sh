#!/usr/bin/env bash
echo "******************** start compile deploy **********************"

npm --registry=http://r.npm.sankuai.com install

npm --registry=http://r.npm.sankuai.com install --production

npm --registry=http://r.npm.sankuai.com install @fdfe/nest-runtime-nodejs-v2@latest

npm --registry=http://r.npm.sankuai.com run build

echo "******************** end compile deploy **********************"
