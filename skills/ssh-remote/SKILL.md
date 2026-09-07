---
name: ssh-remote
description: >
  SSH 远程服务器操作技能（基于 paramiko）。解决 AI 助手通过 bash 工具执行 ssh 命令时
  卡住/超时的问题。当需要操作远程 Linux 服务器时使用，包括：执行命令、异步长任务、
  文件上传/下载、服务器状态查看。触发场景：用户说"在服务器上执行"、"远程运行"、
  "连服务器"、"上传到服务器"、"从服务器下载"、"重启服务"、"查看服务器状态"等。
  特别适用于：长命令导致 ssh 卡住、需要密码认证的 SSH 连接、文件传输等场景。
  支持密码和私钥两种认证方式。
metadata:
  requires:
    bins: ["python"]
---

# SSH Remote Manager

基于 paramiko 的远程服务器操作工具，**彻底解决 `ssh` 命令卡住/超时问题**。

## 为什么需要这个技能

AI 助手的 `bash` 工具执行 `ssh user@host "命令"` 时，如果远程命令耗时较长（如安装包、启动服务、编译），SSH 会一直等待输出，导致工具超时卡死。

**本技能的解决方案**：用 Python paramiko 库替代直接 ssh 命令，通过以下机制避免卡死：
- **短命令**：同步执行，设置超时，超时自动断开返回
- **长命令**：丢入 tmux 后台异步执行，立即返回任务ID，通过读日志文件轮询进度
- **文件传输**：使用 SFTP 协议，带进度显示

## 凭证配置（首次使用必须）

本技能通过 `env_config` 管理 SSH 凭证，**密码不会出现在任何代码或日志中**。

### 配置方法

```
env_config(action="set", key="SSH_REMOTE_HOST", value="192.168.3.137")
env_config(action="set", key="SSH_REMOTE_USER", value="用户名")
env_config(action="set", key="SSH_REMOTE_PASS", value="密码")
env_config(action="set", key="SSH_REMOTE_PORT", value="22")  # 可选，默认22
```

### 私钥认证（可选，与密码二选一）

```
env_config(action="set", key="SSH_REMOTE_HOST", value="192.168.3.137")
env_config(action="set", key="SSH_REMOTE_USER", value="用户名")
env_config(action="set", key="SSH_REMOTE_KEY", value="C:\\Users\\xxx\\.ssh\\id_ed25519")
```

### 查看已配置的凭证

```
env_config(action="list")
```

## 使用方法

脚本路径：`<base_dir>/scripts/ssh_remote.py`

### 1. 同步执行短命令

适合 `ls`、`cat`、`grep`、`df`、`free`、`ps` 等瞬间完成的命令。

```bash
python "<base_dir>/scripts/ssh_remote.py" exec "ls -la /var/log"
python "<base_dir>/scripts/ssh_remote.py" exec "systemctl status nginx" --timeout 30
```

**超时处理**：默认 15 秒超时。如果命令可能稍长，用 `--timeout` 指定。超时后自动断开，不会卡死。

### 2. 异步执行长命令（核心功能）

适合 `pip install`、`apt install`、`python script.py`、`make` 等耗时命令。

```bash
python "<base_dir>/scripts/ssh_remote.py" async "pip install numpy pandas"
python "<base_dir>/scripts/ssh_remote.py" async "cd ~/project && python3 main.py"
```

**执行后立即返回** TASK_ID 和日志路径，不会卡住。

### 3. 查看异步任务状态

```bash
# 查看所有异步任务
python "<base_dir>/scripts/ssh_remote.py" status

# 查看特定任务（默认30行日志）
python "<base_dir>/scripts/ssh_remote.py" status task_1234567890

# 查看特定任务最近100行
python "<base_dir>/scripts/ssh_remote.py" status task_1234567890 100
```

### 4. 上传文件

```bash
python "<base_dir>/scripts/ssh_remote.py" upload "C:\\local\\file.zip" "~/remote/path/file.zip"
```

自动处理：远程目录若不存在会在目标路径创建文件；带进度条；传输后校验大小。

### 5. 下载文件

```bash
python "<base_dir>/scripts/ssh_remote.py" download "~/remote/file.log" "C:\\local\\file.log"
```

### 6. 服务器信息

```bash
python "<base_dir>/scripts/ssh_remote.py" info
```

输出：主机名、系统版本、CPU/内存/磁盘使用率、监听端口、Python版本、tmux会话列表。

## 典型工作流示例

### 示例1：在服务器上启动服务

```bash
# 1. 停止旧进程
python "<base_dir>/scripts/ssh_remote.py" exec "pkill -f 'python3 app.py' 2>/dev/null; echo DONE"

# 2. 异步启动新进程
python "<base_dir>/scripts/ssh_remote.py" async "cd ~/project && python3 app.py 2>&1 | tee app.log"

# 3. 等待几秒后检查状态
python "<base_dir>/scripts/ssh_remote.py" exec "sleep 3 && ss -tlnp | grep :8080"

# 4. 查看启动日志
python "<base_dir>/scripts/ssh_remote.py" status task_xxxxx 20
```

### 示例2：安装依赖包

```bash
# 1. 异步安装
python "<base_dir>/scripts/ssh_remote.py" async "pip install -r requirements.txt 2>&1 | tail -20"

# 2. 轮询进度
python "<base_dir>/scripts/ssh_remote.py" status task_xxxxx 10
# 重复执行直到看到 "✅ 任务已完成"
```

### 示例3：部署项目

```bash
# 1. 上传代码包
python "<base_dir>/scripts/ssh_remote.py" upload "D:\\project.7z" "~/project.7z"

# 2. 异步解压
python "<base_dir>/scripts/ssh_remote.py" async "cd ~ && 7z x project.7z -o./project -y"

# 3. 检查解压完成
python "<base_dir>/scripts/ssh_remote.py" status task_xxxxx

# 4. 安装依赖
python "<base_dir>/scripts/ssh_remote.py" async "cd ~/project && pip install -r requirements.txt"

# 5. 启动服务
python "<base_dir>/scripts/ssh_remote.py" async "cd ~/project && python3 main.py"
```

## 安全设计

1. **凭证隔离**：密码/私钥通过 `env_config` 加密存储，不出现在脚本、日志、命令行参数中
2. **无硬编码**：脚本中不含任何 IP、用户名、密码
3. **自动降级**：优先私钥认证，其次密码认证，都没有则报错并给出配置指引
4. **连接超时**：所有连接默认 10 秒超时，命令默认 15 秒超时，防止无限等待

## 故障排除

| 问题 | 解决方案 |
|:---|:---|
| `❌ SSH 凭证未配置` | 用 `env_config` 配置 SSH_REMOTE_HOST/USER/PASS |
| `❌ 认证失败` | 检查密码是否正确，或改用私钥认证 |
| `❌ 连接超时` | 检查服务器IP和端口，确认网络可达 |
| 命令执行无输出 | 远程命令可能无 stdout，检查 stderr 输出 |
| 异步任务找不到 | `status` 不带参数查看所有任务ID |
| tmux 未安装 | 脚本会自动尝试 `apt install tmux` |
