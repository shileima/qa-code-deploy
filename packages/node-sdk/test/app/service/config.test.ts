import * as assert from 'assert';
import { Context } from 'egg';
import { app } from 'egg-mock/bootstrap';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('test/app/service/config.test.ts', () => {
  let ctx: Context;
  let tempDir: string;
  let tempInstancesFile: string;
  let tempProxyFile: string;

  before(async () => {
    ctx = app.mockContext();
    
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'instance-test-'));
    tempInstancesFile = path.join(tempDir, '.instances.json');
    tempProxyFile = path.join(tempDir, 'subdomain-proxy.json');
    
    // 临时修改配置路径
    (ctx.app.config.instance as any).instancesFile = tempInstancesFile;
    (ctx.app.config.instance as any).proxyConfigFile = tempProxyFile;
  });

  after(async () => {
    // 清理临时文件
    if (fs.existsSync(tempInstancesFile)) {
      fs.unlinkSync(tempInstancesFile);
    }
    if (fs.existsSync(tempProxyFile)) {
      fs.unlinkSync(tempProxyFile);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  it('should load empty instances config when file not exists', async () => {
    const config = await ctx.service.config.loadInstancesConfig();
    assert(config.instances.length === 0);
    assert(config.nextPort === 5174);
  });

  it('should save and load instances config', async () => {
    const testData = {
      instances: [
        { prefix: 'test123', port: 5174, status: 'stopped' }
      ],
      nextPort: 5175,
    };
    
    await ctx.service.config.saveInstancesConfig(testData);
    const loaded = await ctx.service.config.loadInstancesConfig();
    
    assert(loaded.instances.length === 1);
    assert(loaded.instances[0].prefix === 'test123');
    assert(loaded.nextPort === 5175);
  });

  it('should load empty proxy config when file not exists', async () => {
    const config = await ctx.service.config.loadProxyConfig();
    assert(Object.keys(config.routes).length === 0);
  });

  it('should save and load proxy config', async () => {
    const routes = {
      'test123': 5174,
      'test456': 5175,
    };
    
    await ctx.service.config.updateProxyConfig(routes);
    const loaded = await ctx.service.config.loadProxyConfig();
    
    assert(loaded.routes.test123 === 5174);
    assert(loaded.routes.test456 === 5175);
  });

  it('should find available port', async () => {
    const existingInstances = [
      { prefix: 'test1', port: 5174 },
      { prefix: 'test2', port: 5175 },
    ];
    
    const port = await ctx.service.config.findAvailablePort(5174, existingInstances);
    assert(port >= 5174);
    assert(port !== 5174);
    assert(port !== 5175);
  });

  it('should get theme color', () => {
    const color1 = ctx.service.config.getThemeColor(0);
    const color2 = ctx.service.config.getThemeColor(5);
    const color3 = ctx.service.config.getThemeColor(10);
    
    assert(typeof color1 === 'string');
    assert(color1.startsWith('#'));
    assert(color2 === color1); // 循环使用
    assert(color3 === color1);
  });
});