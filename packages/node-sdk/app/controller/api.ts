import { Controller } from 'egg';
export default class IndexController extends Controller {
    async getUser() {
        const { ctx } = this;
        try {
            const result = await this.service.api.getUser();
            ctx.success(result);
        } catch (e: any) {
            ctx.throw(500, e, { code: 1001, expose: true });
        }
    }
}
