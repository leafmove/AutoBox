#!/usr/bin/env python3
"""
SSH Remote Manager — 基于 paramiko 的远程服务器操作工具
解决 AI 助手通过 bash 工具执行 ssh 命令时卡住/超时的问题。

用法:
  python ssh_remote.py exec    "命令"          # 同步执行短命令（默认15s超时）
  python ssh_remote.py exec    "命令" --timeout 30  # 指定超时
  python ssh_remote.py async   "命令"          # 异步执行长命令（tmux后台）
  python ssh_remote.py status  [task_id] [N]   # 查看异步任务状态/日志
  python ssh_remote.py upload  本地路径 远程路径  # 上传文件
  python ssh_remote.py download 远程路径 本地路径  # 下载文件
  python ssh_remote.py info                    # 服务器系统信息
"""

import sys
import os
import time
import socket

try:
    import paramiko
except ImportError:
    print("ERROR: paramiko 未安装，正在安装...")
    os.system(f'"{sys.executable}" -m pip install paramiko -q')
    import paramiko

# ============================================================
# 凭证获取：环境变量 > env_config > 报错提示
# ============================================================

def get_credentials():
    """获取 SSH 凭证，优先从环境变量读取"""
    # 1. 尝试环境变量（env_config 设置的值会注入为环境变量）
    host = os.environ.get("SSH_REMOTE_HOST", "")
    port = os.environ.get("SSH_REMOTE_PORT", "22")
    user = os.environ.get("SSH_REMOTE_USER", "")
    pwd = os.environ.get("SSH_REMOTE_PASS", "")
    key = os.environ.get("SSH_REMOTE_KEY", "")  # 可选：私钥路径

    # 2. 如果不完整，报错并给出配置指引
    if not host or not user:
        print("=" * 60)
        print("❌ SSH 凭证未配置")
        print("=" * 60)
        print()
        print("请通过 env_config 工具配置以下变量：")
        print()
        print('  env_config(action="set", key="SSH_REMOTE_HOST", value="192.168.x.x")')
        print('  env_config(action="set", key="SSH_REMOTE_USER", value="用户名")')
        print('  env_config(action="set", key="SSH_REMOTE_PASS", value="密码")')
        print('  env_config(action="set", key="SSH_REMOTE_PORT", value="22")  # 可选，默认22')
        print()
        print("或使用私钥认证（二选一）：")
        print('  env_config(action="set", key="SSH_REMOTE_KEY", value="C:\\path\\to\\id_rsa")')
        print()
        print("⚠️ 密码将加密存储在 env_config 中，不会出现在代码或日志里。")
        sys.exit(1)

    return host, int(port), user, pwd, key


def connect(host, port, user, pwd, key_path, timeout=10):
    """建立 SSH 连接"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    connect_kwargs = {"hostname": host, "port": port, "username": user, "timeout": timeout}

    if key_path and os.path.isfile(key_path):
        # 私钥认证
        try:
            pkey = paramiko.Ed25519Key.from_private_key_file(key_path)
        except Exception:
            try:
                pkey = paramiko.RSAKey.from_private_key_file(key_path)
            except Exception:
                pkey = paramiko.ECDSAKey.from_private_key_file(key_path)
        connect_kwargs["pkey"] = pkey
    elif pwd:
        # 密码认证
        connect_kwargs["password"] = pwd
    else:
        print("❌ 未提供密码或私钥路径，无法连接")
        sys.exit(1)

    ssh.connect(**connect_kwargs)
    return ssh


def run_cmd(ssh, cmd, timeout=15):
    """执行远程命令，返回 (stdout, stderr, exit_code)"""
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    code = stdout.channel.recv_exit_status()
    return out, err, code


# ============================================================
# 命令模式
# ============================================================

def mode_exec(ssh, cmd, timeout=15):
    """同步执行短命令"""
    out, err, code = run_cmd(ssh, cmd, timeout=timeout)
    if out:
        print(out)
    if err:
        print(f"[STDERR] {err}")
    if code != 0:
        print(f"[EXIT CODE] {code}")


def mode_async(ssh, cmd):
    """异步执行长命令（tmux 后台），立即返回任务ID"""
    task_id = f"task_{int(time.time())}"
    task_log = f"/tmp/{task_id}.log"

    # 确保 tmux 已安装
    run_cmd(ssh, "which tmux >/dev/null 2>&1 || sudo apt install -y tmux 2>&1 | tail -1", timeout=30)

    # 构造 tmux 命令
    escaped_cmd = cmd.replace("'", "'\\''")
    tmux_cmd = (
        f"tmux new-session -d -s {task_id} "
        f"'echo \"=== START: $(date) ===\" > {task_log}; "
        f"{escaped_cmd} 2>&1 | tee -a {task_log}; "
        f"echo; echo \"=== DONE: $(date) ===\" >> {task_log}; "
        f"echo \"EXIT_CODE=$?\" >> {task_log}'"
    )

    out, err, code = run_cmd(ssh, tmux_cmd, timeout=10)

    if code == 0:
        print(f"✅ 任务已异步启动")
        print(f"   TASK_ID: {task_id}")
        print(f"   LOG: {task_log}")
        print(f"   查看状态: python ssh_remote.py status {task_id}")
    else:
        print(f"❌ 启动失败: {err}")
        print(f"   尝试同步执行: python ssh_remote.py exec \"{cmd}\" --timeout 60")


def mode_status(ssh, task_id=None, lines=30):
    """查看异步任务状态"""
    if not task_id:
        # 列出所有任务
        out, _, _ = run_cmd(ssh, "tmux list-sessions 2>/dev/null | grep 'task_' || echo '(无异步任务)'")
        print("当前异步任务:")
        print(out)
        return

    task_log = f"/tmp/{task_id}.log"
    out, err, code = run_cmd(ssh, f"tail -{lines} {task_log} 2>/dev/null")

    if not out and "No such file" in (err or ""):
        print(f"❌ 日志文件不存在: {task_log}")
        print(f"   任务ID可能有误，查看所有任务: python ssh_remote.py status")
        return

    print(out)

    # 检查是否完成
    done_check, _, _ = run_cmd(ssh, f"grep '=== DONE:' {task_log} 2>/dev/null")
    if done_check:
        exit_check, _, _ = run_cmd(ssh, f"grep 'EXIT_CODE=' {task_log} 2>/dev/null")
        print()
        print(f"✅ 任务已完成 {exit_check}")
    else:
        print()
        print("⏳ 任务执行中...")


def expand_remote_path(ssh, path):
    """展开远程路径中的 ~ 和环境变量"""
    if "~" in path or "$" in path:
        out, _, _ = run_cmd(ssh, f'eval echo {path}')
        return out.strip()
    return path


def mode_upload(ssh, local_path, remote_path):
    """上传文件"""
    if not os.path.isfile(local_path):
        print(f"❌ 本地文件不存在: {local_path}")
        sys.exit(1)

    size = os.path.getsize(local_path)

    # 展开 ~ 等路径
    remote_path = expand_remote_path(ssh, remote_path)

    print(f"上传: {local_path} ({size/1024/1024:.1f} MB)")
    print(f"到: {remote_path}")

    sftp = ssh.open_sftp()

    # 如果远程路径是目录，追加文件名
    try:
        attrs = sftp.stat(remote_path)
        if attrs.st_mode & 0o040000:  # 是目录
            remote_path = remote_path.rstrip("/") + "/" + os.path.basename(local_path)
    except IOError:
        pass  # 路径不存在，SFTP put 会自动创建

    start = time.time()

    # 带进度的上传
    uploaded = [0]
    last_print = [0]

    def callback(transferred, total):
        uploaded[0] = transferred
        pct = transferred / total * 100 if total else 0
        now = time.time()
        if now - last_print[0] > 0.5 or transferred == total:
            speed = transferred / (now - start) / 1024 / 1024 if now > start else 0
            print(f"\r  {pct:.0f}% ({transferred//1024//1024}/{total//1024//1024} MB) {speed:.1f} MB/s", end="", flush=True)
            last_print[0] = now

    sftp.put(local_path, remote_path, callback=callback)
    elapsed = time.time() - start
    print(f"\n  ✅ 完成: {elapsed:.1f}s ({size/1024/1024/elapsed:.1f} MB/s)")

    # 验证
    remote_attrs = sftp.stat(remote_path)
    if remote_attrs.st_size == size:
        print(f"  ✅ 文件大小验证通过: {remote_attrs.st_size} bytes")
    else:
        print(f"  ⚠️ 大小不匹配: 本地={size} 远程={remote_attrs.st_size}")

    sftp.close()


def mode_download(ssh, remote_path, local_path):
    """下载文件"""
    # 展开 ~ 等路径
    remote_path = expand_remote_path(ssh, remote_path)

    sftp = ssh.open_sftp()

    try:
        remote_attrs = sftp.stat(remote_path)
        size = remote_attrs.st_size
    except IOError:
        print(f"❌ 远程文件不存在: {remote_path}")
        sftp.close()
        sys.exit(1)

    print(f"下载: {remote_path} ({size/1024/1024:.1f} MB)")
    print(f"到: {local_path}")

    start = time.time()

    def callback(transferred, total):
        pct = transferred / total * 100 if total else 0
        now = time.time()
        if now - start > 0.5 or transferred == total:
            speed = transferred / (now - start) / 1024 / 1024 if now > start else 0
            print(f"\r  {pct:.0f}% ({transferred//1024//1024}/{total//1024//1024} MB) {speed:.1f} MB/s", end="", flush=True)

    sftp.get(remote_path, local_path, callback=callback)
    elapsed = time.time() - start
    print(f"\n  ✅ 完成: {elapsed:.1f}s")

    local_size = os.path.getsize(local_path)
    if local_size == size:
        print(f"  ✅ 文件大小验证通过")
    else:
        print(f"  ⚠️ 大小不匹配")

    sftp.close()


def mode_info(ssh):
    """服务器系统信息"""
    cmd = """
        echo "=== 系统信息 ==="
        echo "主机: $(hostname)"
        echo "系统: $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
        echo "内核: $(uname -r)"
        echo "时间: $(date)"
        echo "运行: $(uptime -p 2>/dev/null || echo 'N/A')"
        echo ""
        echo "=== 资源使用 ==="
        echo "CPU: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}')%"
        echo "内存: $(free -h | awk '/Mem:/{print $3 \"/\" $2}')"
        echo "磁盘: $(df -h / | awk 'NR==2{print $3 \"/\" $2 \" (\" $5 \")\"}')"
        echo ""
        echo "=== 监听端口 ==="
        ss -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | sort -u | head -20
        echo ""
        echo "=== Python ==="
        python3 --version 2>&1
        echo "pip包数: $(pip3 list 2>/dev/null | wc -l)"
        echo ""
        echo "=== tmux 会话 ==="
        tmux list-sessions 2>/dev/null || echo "(无)"
    """
    out, _, _ = run_cmd(ssh, cmd, timeout=10)
    print(out)


# ============================================================
# 主入口
# ============================================================

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    mode = sys.argv[1]
    host, port, user, pwd, key = get_credentials()

    try:
        ssh = connect(host, port, user, pwd, key)
    except socket.timeout:
        print(f"❌ 连接超时: {host}:{port}")
        sys.exit(1)
    except paramiko.AuthenticationException:
        print(f"❌ 认证失败: {user}@{host}")
        print("   请检查 SSH_REMOTE_USER / SSH_REMOTE_PASS / SSH_REMOTE_KEY 配置")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        sys.exit(1)

    try:
        if mode == "exec":
            # exec "命令" [--timeout N]
            cmd = sys.argv[2] if len(sys.argv) > 2 else ""
            timeout = 15
            if "--timeout" in sys.argv:
                idx = sys.argv.index("--timeout")
                timeout = int(sys.argv[idx + 1]) if idx + 1 < len(sys.argv) else 15
            if not cmd:
                print("用法: ssh_remote.py exec \"命令\" [--timeout N]")
                sys.exit(1)
            mode_exec(ssh, cmd, timeout=timeout)

        elif mode == "async":
            # async "命令"
            cmd = sys.argv[2] if len(sys.argv) > 2 else ""
            if not cmd:
                print("用法: ssh_remote.py async \"命令\"")
                sys.exit(1)
            mode_async(ssh, cmd)

        elif mode == "status":
            # status [task_id] [lines]
            task_id = sys.argv[2] if len(sys.argv) > 2 else None
            lines = int(sys.argv[3]) if len(sys.argv) > 3 else 30
            mode_status(ssh, task_id, lines)

        elif mode == "upload":
            # upload 本地路径 远程路径
            if len(sys.argv) < 4:
                print("用法: ssh_remote.py upload 本地路径 远程路径")
                sys.exit(1)
            mode_upload(ssh, sys.argv[2], sys.argv[3])

        elif mode == "download":
            # download 远程路径 本地路径
            if len(sys.argv) < 4:
                print("用法: ssh_remote.py download 远程路径 本地路径")
                sys.exit(1)
            mode_download(ssh, sys.argv[2], sys.argv[3])

        elif mode == "info":
            mode_info(ssh)

        else:
            print(f"未知模式: {mode}")
            print(__doc__)
            sys.exit(1)

    finally:
        ssh.close()


if __name__ == "__main__":
    main()
