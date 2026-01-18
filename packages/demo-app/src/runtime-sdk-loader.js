// 运行时 SDK 加载器
// 在生产环境中，这里应该加载构建后的 SDK 文件
// 在开发环境中，我们直接使用开发版本的 SDK

// 由于我们在 monorepo 中，可以直接导入 SDK 源码
// 但为了简化，我们创建一个内联的简化版本

// 注意：在实际项目中，应该从构建后的 dist 目录加载
// 例如：script.src = '/path/to/runtime-sdk/dist/index.js';

// 这里我们使用动态导入（如果支持）或者直接定义简化版本
(function() {
  // 检查是否已经加载
  if (window.RenderMonitorSDK) {
    return;
  }

  // 由于我们在开发环境中，暂时使用一个占位符
  // 实际应该加载构建后的 SDK
  console.warn('[DemoApp] 运行时 SDK 需要从构建后的文件加载');
  
  // 创建一个占位符，实际使用时应该替换为真实的 SDK
  window.RenderMonitorSDK = class {
    constructor() {
      console.log('[DemoApp] RenderMonitorSDK 占位符已创建');
    }
    init() {
      console.log('[DemoApp] RenderMonitorSDK 初始化（占位符）');
    }
    destroy() {
      console.log('[DemoApp] RenderMonitorSDK 销毁（占位符）');
    }
  };
})();
