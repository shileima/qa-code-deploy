import { Controller } from 'egg';

/**
 * 实例管理控制器
 */
export default class InstanceController extends Controller {
  /**
   * 创建实例
   * POST /api/instances
   * Body: { prefix?: string, port?: number }
   */
  async create() {
    const { ctx } = this;
    try {
      const { prefix, port } = ctx.request.body;
      const result = await this.service.instance.createInstance({ prefix, port });
      ctx.success(result, { status: 201 });
    } catch (e: any) {
      const message = e.message || '创建实例失败';
      const code = e.code || 2001;
      
      if (message.includes('前缀已存在') || message.includes('前缀格式无效')) {
        ctx.throw(400, message, { code, expose: true });
      } else if (message.includes('端口') && message.includes('占用')) {
        ctx.throw(400, message, { code, expose: true });
      } else {
        ctx.throw(500, message, { code, expose: true });
      }
    }
  }

  /**
   * 删除实例
   * DELETE /api/instances/:prefix
   */
  async destroy() {
    const { ctx } = this;
    try {
      const prefix = ctx.params.prefix;
      await this.service.instance.deleteInstance(prefix);
      ctx.success({ message: '实例已删除' }, { status: 200 });
    } catch (e: any) {
      const message = e.message || '删除实例失败';
      const code = e.code || 2002;
      
      if (message.includes('不存在')) {
        ctx.throw(404, message, { code, expose: true });
      } else {
        ctx.throw(500, message, { code, expose: true });
      }
    }
  }

  /**
   * 列出所有实例
   * GET /api/instances
   */
  async index() {
    const { ctx } = this;
    try {
      const result = await this.service.instance.listInstances();
      ctx.success(result);
    } catch (e: any) {
      ctx.throw(500, e.message || '获取实例列表失败', { code: 2003, expose: true });
    }
  }

  /**
   * 获取实例详情
   * GET /api/instances/:prefix
   */
  async show() {
    const { ctx } = this;
    try {
      const prefix = ctx.params.prefix;
      const result = await this.service.instance.getInstance(prefix);
      ctx.success(result);
    } catch (e: any) {
      const message = e.message || '获取实例详情失败';
      const code = e.code || 2004;
      
      if (message.includes('不存在')) {
        ctx.throw(404, message, { code, expose: true });
      } else {
        ctx.throw(500, message, { code, expose: true });
      }
    }
  }

  /**
   * 启动实例
   * POST /api/instances/:prefix/start
   */
  async start() {
    const { ctx } = this;
    try {
      const prefix = ctx.params.prefix;
      const result = await this.service.instance.startInstance(prefix);
      ctx.success(result);
    } catch (e: any) {
      const message = e.message || '启动实例失败';
      const code = e.code || 2005;
      
      if (message.includes('不存在')) {
        ctx.throw(404, message, { code, expose: true });
      } else if (message.includes('已在运行')) {
        ctx.throw(400, message, { code, expose: true });
      } else {
        ctx.throw(500, message, { code, expose: true });
      }
    }
  }

  /**
   * 停止实例
   * POST /api/instances/:prefix/stop
   */
  async stop() {
    const { ctx } = this;
    try {
      const prefix = ctx.params.prefix;
      const result = await this.service.instance.stopInstance(prefix);
      ctx.success(result);
    } catch (e: any) {
      const message = e.message || '停止实例失败';
      const code = e.code || 2006;
      
      if (message.includes('不存在')) {
        ctx.throw(404, message, { code, expose: true });
      } else if (message.includes('未在运行')) {
        ctx.throw(400, message, { code, expose: true });
      } else {
        ctx.throw(500, message, { code, expose: true });
      }
    }
  }
}