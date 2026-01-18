# Vite 开发服务器 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm 和 wget (用于健康检查)
RUN npm install -g pnpm && \
    apk add --no-cache wget

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./

# 安装依赖
# 如果存在 pnpm-lock.yaml 使用 frozen-lockfile，否则直接安装
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# 复制源代码
COPY . .

# 暴露端口（默认 5174，可通过环境变量覆盖）
EXPOSE 5174

# 启动开发服务器
CMD ["npm", "run", "dev"]
