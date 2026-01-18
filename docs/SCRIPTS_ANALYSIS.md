# 脚本文件分析与优化建议

## 📋 脚本功能对比

### 1. `restart-services.sh` ✅ 推荐保留
**功能**：完整重启流程
- ✅ 停止所有服务（Vite + 代理）
- ✅ 配置 hosts 文件
- ✅ 启动两个 Vite 实例（5174, 5175）
- ✅ 启动代理服务器（优先80端口，失败则8080）
- ✅ 端口验证和错误处理

**特点**：
- 需要手动输入 sudo 密码（交互式）
- 智能端口回退（80 → 8080）
- 完整的状态验证

**适用场景**：日常开发中完整重启所有服务

---

### 2. `start-all-80.sh` ⚠️ 与 `restart-services.sh` 高度重复
**功能**：完整启动流程（与 `restart-services.sh` 几乎相同）
- ✅ 停止所有服务
- ✅ 配置 hosts 文件
- ✅ 启动两个 Vite 实例
- ✅ 启动代理服务器（强制80端口）

**特点**：
- ⚠️ **硬编码密码** `PASSWORD="1111"`（安全风险！）
- 包含端口验证和日志查看提示

**适用场景**：需要自动化但不想输入密码（不推荐）

**建议**：删除或重构为 `restart-services.sh` 的选项

---

### 3. `setup-subdomain.sh` ✅ 保留
**功能**：配置 hosts 文件
- ✅ 自动添加子域名到 `/etc/hosts`
- ✅ 检查已存在配置（避免重复）
- ✅ 提供使用说明

**特点**：
- 单一职责（只配置 hosts）
- 自动执行，无交互

**适用场景**：首次配置或单独配置 hosts 文件

---

### 4. `setup-subdomain-access.sh` ❌ 与 `setup-subdomain.sh` 完全重复
**功能**：配置 hosts 文件（与 `setup-subdomain.sh` 完全相同）

**特点**：
- 需要手动确认（交互式）
- 功能完全重复

**建议**：删除，使用 `setup-subdomain.sh` 替代

---

### 5. `start-proxy-80.sh` ✅ 保留
**功能**：只启动代理服务器
- ✅ 检查端口80占用情况
- ✅ 交互式确认是否停止占用进程
- ✅ 只管理代理服务器，不影响 Vite 实例

**特点**：
- 单一职责（只启动代理）
- 交互式端口冲突处理
- 可用于单独重启代理服务器

**适用场景**：代理服务器崩溃时单独重启，或测试代理功能

---

## 🔄 重复情况总结

### 完全重复
1. ❌ `setup-subdomain-access.sh` ← 删除，使用 `setup-subdomain.sh`

### 高度重复
2. ⚠️ `start-all-80.sh` ← 与 `restart-services.sh` 功能重复，区别仅在于密码处理

### 部分功能重叠
3. `restart-services.sh` 包含 `setup-subdomain.sh` 的功能（hosts 配置）
   - 但这是合理的，因为重启时需要确保 hosts 配置存在

---

## ✨ 优化建议

### 方案 1：精简脚本（推荐）
保留核心脚本，删除冗余：

```
✅ 保留：
  - restart-services.sh        # 完整重启（主要使用）
  - setup-subdomain.sh         # 单独配置 hosts
  - start-proxy-80.sh          # 单独启动代理

❌ 删除：
  - setup-subdomain-access.sh  # 与 setup-subdomain.sh 重复
  - start-all-80.sh            # 与 restart-services.sh 重复（且硬编码密码）
```

### 方案 2：增强 `restart-services.sh`
在 `restart-services.sh` 中添加选项支持：

```bash
# 添加命令行参数支持
./restart-services.sh --port 80    # 强制使用 80 端口
./restart-services.sh --skip-hosts # 跳过 hosts 配置
```

### 方案 3：使用 `.env` 文件
将密码移到 `.env` 文件（不提交到 Git），在 `start-all-80.sh` 中读取：

```bash
# .env（不提交）
SUDO_PASSWORD=your_password

# start-all-80.sh
source .env 2>/dev/null || true
if [ -z "$SUDO_PASSWORD" ]; then
  echo "请设置 .env 文件中的 SUDO_PASSWORD"
  exit 1
fi
```

---

## 📊 使用场景对照表

| 场景 | 推荐脚本 | 说明 |
|------|---------|------|
| 完整重启所有服务 | `restart-services.sh` | 日常开发最常用 |
| 首次配置环境 | `setup-subdomain.sh` | 只需配置 hosts |
| 只重启代理服务器 | `start-proxy-80.sh` | 代理崩溃时使用 |
| 自动化部署（CI/CD） | 考虑使用环境变量 | 避免硬编码密码 |

---

## 🛡️ 安全建议

1. **删除硬编码密码**：`start-all-80.sh` 中的 `PASSWORD="1111"` 应立即移除
2. **使用环境变量**：敏感信息应通过环境变量传递
3. **权限最小化**：只在必要时使用 sudo，并明确说明原因

---

## 📝 最终推荐

**核心脚本（3个）**：
1. ✅ `restart-services.sh` - 完整重启流程
2. ✅ `setup-subdomain.sh` - 配置 hosts 文件
3. ✅ `start-proxy-80.sh` - 单独启动代理

**可删除（2个）**：
1. ❌ `setup-subdomain-access.sh` - 完全重复
2. ⚠️ `start-all-80.sh` - 功能重复且存在安全问题
