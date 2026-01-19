import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';
import * as path from 'path';

export default (appInfo: EggAppInfo) => {
    const config = {} as PowerPartial<EggAppConfig>;

    // override config from framework / plugin
    // use for cookie sign key, should change to your own and keep security
    config.keys = appInfo.name + '_1718764991577_1880';

    // add your egg config in here
    config.middleware = ['logger', 'cat', 'customHandler', 'errorHandler'];

    // add your special config in here
    const bizConfig = {
        sourceUrl: `https://github.com/eggjs/examples/tree/master/${appInfo.name}`,
    };

    config.watcher = {
        enable: false, // 关闭egg-watcher插件
    };

    config.security = {
        xframe: {
            enable: false,
        },
        csrf: {
            enable: false,
        },
    };

    // 实例管理配置
    config.instance = {
        instancesFile: path.join(appInfo.baseDir, '../../.instances.json'),
        proxyConfigFile: path.join(appInfo.baseDir, '../../config/subdomain-proxy.json'),
        dockerComposeFile: path.join(appInfo.baseDir, '../../docker-compose.yml'),
        projectRoot: path.join(appInfo.baseDir, '../..'),
        demoAppPath: path.join(appInfo.baseDir, '../../packages/demo-app'),
        generateScriptPath: path.join(appInfo.baseDir, '../../scripts/generate-docker-compose.js'),
        generateAppConfigScriptPath: path.join(appInfo.baseDir, '../../scripts/generate-app-config.js'),
        generateNginxScriptPath: path.join(appInfo.baseDir, '../../scripts/generate-nginx-sandbox-config.js'),
        defaultPort: 5174,
        prefixLength: 16,
        subdomainDomain: 'sandbox.aie.sankuai.com', // 外部域名
        containerPort: 5174, // 容器内部端口
        proxyScriptPath: path.join(appInfo.baseDir, '../../scripts/subdomain-proxy.js'),
    };

    // the return config will combines to EggAppConfig
    return {
        ...config,
        ...bizConfig,
    };
};
exports.watcher = {
    enable: false, // 禁用egg-watcher插件
};
