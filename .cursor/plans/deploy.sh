
## [!important] vite执行构建特殊配置
- 静态资源的路径base 是 "https://aie.sankuai.com/rdc_host/app/${package.name}/vite/${package.version}/"
- 打包后的 remoteEntry.js 文件不需要放进 assets 文件夹，和 index.html 平级输出
- vite.config.mts 增加tailwindcss插件配置:
`
import tailwindcss from '@tailwindcss/vite'
plugins: {
    tailwindcss(), // 必须在 federation 之前
    federation({
      // 你的 federation 配置
    })
}
`
- `vite.config.mts`  提供标准 Vite 配置模板，增加构建配置：
   `
       base: "https://aie.sankuai.com/rdc_host/app/${projectName}/vite/${version}/",
       build: {
      outDir: `/dist/app/${projectName}/vite/${version}/`,
      target: 'esnext',
      minify: mode === 'production' ? 'terser' : false,
      sourcemap: false,
      emptyOutDir: isProd, // 生产环境清空输出目录
      assetsDir: '', // 禁用 assets 目录，所有文件输出到根目录
      rollupOptions: {
        output: {
          format: 'esm',
          // 所有文件都输出到根目录，不使用 assets 目录
          chunkFileNames: '[name].[hash].js',
          assetFileNames: '[name].[hash].[ext]',
          // federation 插件的 filename 配置会生成 remoteEntry.js 在根目录
          // 不需要设置 entryFileNames，federation 插件会处理
         cssCodeSplit: true, // 启用 CSS 代码分割
          manualChunks: {
             'tailwind': ['tailwindcss']
          }
        },
        external: [],
      },
    }
   `
- `package.json` - 包含脚本和依赖模板， name 根据用户输入或根据用户描述自动生成，例如 qa-app-xxx，版本 version 默认 0.0.1。
- `script/deploy.sh` - 用于 CDN 部署的脚本。
- `index.html` - 提供预览页面模板。
- 约束依赖库清单（React 18、Ant Design 5 等）。

## 全局安装pnpm、 webstatic 工具
npm install pnpm -g
pnpm add -g @bfe/webstatic --registry=http://r.npm.sankuai.com/

## 部署脚本 deploy.sh
PROJECT_NAME="qa-app-xxx"
VERSION="0.0.1"
BUILD_DIR="dist"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='webstatic publish --appkey=com.sankuai.waimaiqafc.aie --env=prod --artifact=dist --build-command='npm run build' --token=269883ad-b7b0-4431-b5e7-5886cd1d590f'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  CDN 发布脚本${NC}"
echo -e "${BLUE}  项目: ${PROJECT_NAME}${NC}"
echo -e "${BLUE}  版本: ${VERSION}${NC}"
echo -e "${BLUE}======================================${NC}"

# 检查构建产物是否存在
if [ ! -d "$BUILD_DIR" ]; then
  echo -e "${RED}错误: 构建产物目录不存在: ${BUILD_DIR}${NC}"
  echo -e "${RED}请先运行: npm run build${NC}"
  exit 1
fi

echo -e "\n${GREEN}✓ 构建产物检查通过${NC}"

#### 显示构建产物信息
echo -e "\n${BLUE}构建产物统计:${NC}"
echo "文件数量: $(find ${BUILD_DIR} -type f | wc -l)"
echo "总大小: $(du -sh ${BUILD_DIR} | cut -f1)"

#### 列出所有构建文件
echo -e "\n${BLUE}构建文件列表:${NC}"
find ${BUILD_DIR} -type f | sed "s|${BUILD_DIR}/||" | sort

#### 检查 webstatic 命令是否存在
if ! command -v webstatic &> /dev/null; then

#### 使用 webstatic 发布到 CDN
echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}  开始发布到 CDN${NC}"
echo -e "${BLUE}======================================${NC}"

## 部署成功后输出
访问地址: "https://aie.sankuai.com/rdc_host/app/${PROJECT_NAME}/vite/${VERSION}/index.html"
- 将这个链接写入到 `.biz/context.json` 中的 deploy_url 中