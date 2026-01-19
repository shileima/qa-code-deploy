import * as assert from 'assert';
import { app } from 'egg-mock/bootstrap';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('test/app/controller/instance.test.ts', () => {
  let tempDir: string;
  let tempInstancesFile: string;
  let tempProxyFile: string;

  before(async () => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'instance-api-test-'));
    tempInstancesFile = path.join(tempDir, '.instances.json');
    tempProxyFile = path.join(tempDir, 'subdomain-proxy.json');
    
    // 临时修改配置路径
    (app.config.instance as any).instancesFile = tempInstancesFile;
    (app.config.instance as any).proxyConfigFile = tempProxyFile;
    
    // 初始化空配置
    fs.writeFileSync(tempInstancesFile, JSON.stringify({
      instances: [],
      nextPort: 5174,
    }), 'utf8');
    fs.writeFileSync(tempProxyFile, JSON.stringify({
      routes: {},
      updatedAt: new Date().toISOString(),
    }), 'utf8');
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

  it('should GET /api/instances - list empty instances', async () => {
    const result = await app.httpRequest()
      .get('/api/instances')
      .expect(200);
    
    assert(result.body.code === 0);
    assert(Array.isArray(result.body.data));
    assert(result.body.data.length === 0);
  });

  it('should POST /api/instances - create instance (without prefix and port)', async () => {
    // Mock Docker 操作以避免实际执行
    const originalGenerateDockerCompose = app.service.docker.generateDockerCompose;
    const originalStartContainer = app.service.docker.startContainer;
    const originalGenerateAppConfig = app.service.docker.generateAppConfig;
    const originalGenerateNginxConfig = app.service.docker.generateNginxConfig;
    const originalReloadProxy = app.service.docker.reloadProxy;
    
    app.service.docker.generateDockerCompose = async () => {};
    app.service.docker.generateAppConfig = async () => {};
    app.service.docker.generateNginxConfig = async () => {};
    app.service.docker.startContainer = async () => {};
    app.service.docker.reloadProxy = async () => {};
    
    try {
      const result = await app.httpRequest()
        .post('/api/instances')
        .send({})
        .expect(201);
      
      assert(result.body.code === 0);
      assert(result.body.data.prefix);
      assert(result.body.data.port);
      assert(result.body.data.status === 'running');
      assert(result.body.data.url);
      assert(result.body.data.externalUrl);
      
      // 恢复原始方法
      app.service.docker.generateDockerCompose = originalGenerateDockerCompose;
      app.service.docker.startContainer = originalStartContainer;
      app.service.docker.generateAppConfig = originalGenerateAppConfig;
      app.service.docker.generateNginxConfig = originalGenerateNginxConfig;
      app.service.docker.reloadProxy = originalReloadProxy;
    } catch (err) {
      // 确保恢复原始方法
      app.service.docker.generateDockerCompose = originalGenerateDockerCompose;
      app.service.docker.startContainer = originalStartContainer;
      app.service.docker.generateAppConfig = originalGenerateAppConfig;
      app.service.docker.generateNginxConfig = originalGenerateNginxConfig;
      app.service.docker.reloadProxy = originalReloadProxy;
      throw err;
    }
  });

  it('should POST /api/instances - create instance with custom prefix', async () => {
    // Mock Docker 操作
    const originalGenerateDockerCompose = app.service.docker.generateDockerCompose;
    const originalStartContainer = app.service.docker.startContainer;
    const originalGenerateAppConfig = app.service.docker.generateAppConfig;
    const originalGenerateNginxConfig = app.service.docker.generateNginxConfig;
    const originalReloadProxy = app.service.docker.reloadProxy;
    
    app.service.docker.generateDockerCompose = async () => {};
    app.service.docker.generateAppConfig = async () => {};
    app.service.docker.generateNginxConfig = async () => {};
    app.service.docker.startContainer = async () => {};
    app.service.docker.reloadProxy = async () => {};
    
    try {
      const result = await app.httpRequest()
        .post('/api/instances')
        .send({ prefix: 'testprefix123' })
        .expect(201);
      
      assert(result.body.code === 0);
      assert(result.body.data.prefix === 'testprefix123');
      
      // 恢复原始方法
      app.service.docker.generateDockerCompose = originalGenerateDockerCompose;
      app.service.docker.startContainer = originalStartContainer;
      app.service.docker.generateAppConfig = originalGenerateAppConfig;
      app.service.docker.generateNginxConfig = originalGenerateNginxConfig;
      app.service.docker.reloadProxy = originalReloadProxy;
    } catch (err) {
      app.service.docker.generateDockerCompose = originalGenerateDockerCompose;
      app.service.docker.startContainer = originalStartContainer;
      app.service.docker.generateAppConfig = originalGenerateAppConfig;
      app.service.docker.generateNginxConfig = originalGenerateNginxConfig;
      app.service.docker.reloadProxy = originalReloadProxy;
      throw err;
    }
  });

  it('should reject invalid prefix format', async () => {
    const result = await app.httpRequest()
      .post('/api/instances')
      .send({ prefix: 'invalid' }) // 太短
      .expect(400);
    
    assert(result.body.code !== 0);
    assert(result.body.message.includes('前缀格式无效') || result.body.message.includes('前缀'));
  });

  it('should GET /api/instances/:prefix - get instance not found', async () => {
    const result = await app.httpRequest()
      .get('/api/instances/nonexistent')
      .expect(404);
    
    assert(result.body.code !== 0);
    assert(result.body.message.includes('不存在'));
  });
});