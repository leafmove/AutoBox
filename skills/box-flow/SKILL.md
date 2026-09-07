---
name: box-flow
description: Box流程管理CLI工具。支持通过API远程管理Box流程，包括搜索和查询激活Box流程列表、运行Box流程、查询Box流程执行任务状态、查询Box流程执行任务结果等。支持同步运行和异步调用，默认同步运行。仅运行一次不重试，失败时直接返回错误信息。当用户提到搜索Box流程、执行Box流程时，先查找有没有激活的符合要求的Box流程，如果有则运行Box流程帮助用户完成任务，如果没有则略过。
---

# App Flow CLI 技能

通过 API 以 CLI 形式管理 Box 流程。

**核心原则：仅运行一次，失败时直接返回错误信息，不重试。**

## 🚀 CLI 命令速查（直接用）

脚本路径：`skills/box-flow/scripts/app_flow_client.py`

```bash
cd skills/box-flow/scripts

# 列出所有激活的 Box 流程
python app_flow_client.py list-boxes

# 按关键词搜索 Box（如"翻译"、"图片处理"、"小红书"）
python app_flow_client.py search --query "关键词"

# 同步运行 Box（默认同步，等待完成）
python app_flow_client.py run <box_id> --web-input '{"key":"value"}'

# 异步提交 Box
python app_flow_client.py submit <box_id> --web-input '{"key":"value"}'

# 查看任务状态
python app_flow_client.py status --task-id <task_id>

# 查看任务结果
python app_flow_client.py result --task-id <task_id>

# 列出任务历史
python app_flow_client.py list

# 取消/删除/查看日志
python app_flow_client.py cancel --task-id <task_id>
python app_flow_client.py delete --task-id <task_id>
python app_flow_client.py logs --task-id <task_id>

# 打开本地 .json 文件（绝对路径），由前端预览/解析
python app_flow_client.py open "D:/boxes/工具类/文件操作/B202607162100/skill_installer_flow.json"

# 导入本地 .json 文件（绝对路径）到流程目录
python app_flow_client.py import "C:/Users/autobox/Desktop/skill_installer_flow.json"
```

**常用操作流程**：
1. `list-boxes` 或 `search` → 找到需要的 Box ID
2. `run <box_id>` → 同步运行（或 `submit` 异步提交）
3. `status`/`result` → 查询任务结果（异步时）

---

## Python API 用法

### 初始化客户端

```python
from app_flow_client import AppFlowClient, AppFlowError, TaskError

# 默认连接 localhost:8066
client = AppFlowClient()

# 自定义地址
client = AppFlowClient(host="192.168.1.100", port=8066)
```

### 列出全部 Box（激活的流程）

```python
boxes = client.list_boxes()
for box in boxes:
    print(f"{box['id']} - {box['name']} ({box['version']})")
    print(f"  分类: {box.get('types', '')} | 作者: {box.get('creator', '')}")
    print(f"  说明: {box.get('instructions', '').strip()[:80]}")
```

### 搜索 Box（按关键词）

```python
boxes = client.search_boxes("翻译")
for box in boxes:
    print(f"{box['name']} ({box['id']})")
    print(f"  说明: {box['instructions']}")
    print(f"  参数:")
    for p in box.get('parameters', []):
        req = "✓必填" if p['required'] else "选填"
        print(f"    - {p['name']} ({p['type']}) {req}: {p['description']}")
```

**响应字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | Box ID，用于调用时指定 |
| name | string | Box 名称 |
| version | string | 版本号 |
| types | string | 分类标签（如 "T1办公常用,T2快捷工具"） |
| creator | string | 创建者 |
| instructions | string | Box 功能描述 |
| parameters | array | 推断的输入参数列表（仅 search 返回） |
| parameters[].name | string | 参数名称 |
| parameters[].type | string | 参数类型 (string/integer/number/boolean/object/array) |
| parameters[].description | string | 参数描述 |
| parameters[].required | boolean | 是否必填 |

### 同步运行（默认，仅一次）

```python
try:
    result = client.run(box_id="B202512141548", web_input={"message": "Hello"}, timeout=60)
    print(result["result"])
except AppFlowError as e:
    print(f"API错误: {e}")
except TaskError as e:
    print(f"任务失败 [{e.status}]: {e.error}")
    print(f"Task ID: {e.task_id}")
```

### 异步提交（仅一次）

```python
try:
    task = client.submit(box_id="B202512141548", web_input={"message": "Hello"})
    task_id = task["autobox_task_id"]
    
    # 查询状态
    status = client.get_status(task_id)
    print(status)
    
    # 获取结果
    result = client.get_result(task_id)
    print(result)
except AppFlowError as e:
    print(f"API错误: {e}")
```

### 打开本地 Box JSON 文件（绝对路径）

调用后端 `POST /box/open`，传入磁盘上的 `.json` 流程文件绝对路径，
由前端解析并预览（不会把文件落地到流程目录）。

```python
resp = client.open_box("D:/boxes/工具类/文件操作/B202607162100/skill_installer_flow.json")
# 成功
# {"status": "执行成功", "box_id": "D:/boxes/.../skill_installer_flow.json"}
# 失败（包含 HTTP 状态码与后端业务错误信息）
# {"status": "执行失败", "error": "...", "status_code": 403}
```

### 导入本地 Box JSON 文件（绝对路径）

调用后端 `POST /box/import`，把磁盘上的 `.json` 流程文件
复制到流程管理目录，返回 `target_dir / json_path / box_path`。

```python
resp = client.import_box("C:/Users/autobox/Desktop/skill_installer_flow.json")
if resp.get("status") == "执行成功":
    info = resp["result"]
    print("导入到:", info["target_dir"])
    print("json:", info["json_path"])
    print("box:",  info["box_path"])
else:
    print("失败:", resp.get("error"), f"(HTTP {resp.get('status_code')})")
```

**说明**：`open_box` / `import_box` 与 `run` / `submit` 不同——它们的
`box_id` 参数指的是磁盘上的 `.json` 文件绝对路径，而非已激活的 Box ID；
并且这两个方法在 HTTP 4xx/5xx 时不会抛异常，而是把响应字典原样返回
（`status` / `error` / `status_code` 字段），便于调用方与后端约定保持一致。
只有连接失败/请求超时等网络错误才会抛 `AppFlowError`。

## 错误类型

| 异常类型 | 说明 | 属性 |
|----------|------|------|
| `AppFlowError` | API调用失败（连接、超时、HTTP错误等） | `error_code`, `details` |
| `TaskError` | 任务执行失败（failed、timeout等） | `task_id`, `status`, `result`, `error` |

## API 参考

| 方法 | 说明 |
|------|------|
| `client.list_boxes(box_id)` | 列出激活的Box流程，支持筛选单个 |
| `client.search_boxes(query)` | 按关键词搜索 Box，返回匹配列表及参数 |
| `client.open_box(box_id)` | 打开本地 .json 文件（绝对路径），仅网络错误抛异常 |
| `client.import_box(box_id)` | 导入本地 .json 文件（绝对路径），仅网络错误抛异常 |
| `client.run(box_id, web_input, timeout)` | 同步运行，仅一次，失败抛异常 |
| `client.submit(box_id, web_input)` | 异步提交，仅一次，失败抛异常 |
| `client.get_status(task_id)` | 获取任务状态，失败抛异常 |
| `client.get_result(task_id)` | 获取任务结果，失败抛异常 |
| `client.list_tasks(status, limit)` | 列出任务历史，失败抛异常 |
| `client.cancel(task_id)` | 取消任务，失败抛异常 |
| `client.delete_task(task_id)` | 删除任务，失败抛异常 |
| `client.get_logs(task_id)` | 获取任务日志，失败抛异常 |
| `client.wait_for_completion(task_id)` | 轮询等待任务完成 |

## 错误代码

**AppFlowError.error_code**:
- `REQUEST_TIMEOUT` - 请求超时
- `CONNECTION_FAILED` - 连接失败
- `HTTP_ERROR` - HTTP错误
- `API_ERROR` - API返回错误
- `RUN_FAILED` - 任务运行失败
- `WAIT_TIMEOUT` - 等待超时
- `INVALID_ARGUMENT` - 参数不合法（如 `open_box`/`import_box` 收到空字符串）
- `REQUEST_ERROR` - 其他 requests 异常
