import { Application } from 'egg';
const prefix = '/api';
export default (app: Application) => {
    const { controller, router } = app;
    
    router.get('GetUser', `${prefix}/user`, controller.api.getUser);

    // 实例管理路由
    router.resources('instances', `${prefix}/instances`, controller.instance);
    router.post(`${prefix}/instances/:prefix/start`, controller.instance.start);
    router.post(`${prefix}/instances/:prefix/stop`, controller.instance.stop);

    router.get('/health', (ctx) => {
        ctx.body = 'ok';
    })

    router.get('/*', (ctx) => {
        ctx.body = 'ok';
    })
};
