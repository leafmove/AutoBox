# App Flow API 参考

## 基础信息

- **Base URL**: `http://{host}:{port}` (默认 `http://localhost:8066`)
- **认证**: 无需认证（本地网络使用）
- **内容类型**: `application/json`

---

## API 端点

### 0. 按描述搜索 Box

**端点**: `GET /box/search`

根据描述文本在 `funcy=True` 的 Box 中搜索，同时返回推断的输入参数名称和类型。

```bash
# 搜索包含"翻译"关键词的 Box
curl "http://localhost:8066/box/search?q=翻译"

# 搜索包含"图片处理"描述的 Box
curl "http://localhost:8066/box/search?q=图片处理"
```

**响应示例**:
```json
{
  "success": true,
  "query": "翻译",
  "count": 1,
  "boxes": [
    {
      "id": "B202512141548",
      "name": "翻译助手",
      "version": "1.0",
      "keywords": "翻译,Text,TextGen",
      "instructions": "提供中英文翻译功能",
      "parameters": [
        {
          "name": "text",
          "type": "string",
          "description": "待翻译文本",
          "required": true
        },
        {
          "name": "source_lang",
          "type": "string",
          "description": "源语言",
          "required": false
        },
        {
          "name": "target_lang",
          "type": "string",
          "description": "目标语言",
          "required": false
        }
      ],
      "cli_endpoint": "/cli/run",
      "schema_url": "/box/schema/B202512141548"
    }
  ]
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | Box ID |
| name | string | Box 名称 |
| version | string | 版本号 |
| keywords | string | 原始关键词 |
| instructions | string | Box 描述说明 |
| parameters | array | 推断的输入参数列表 |
| parameters[].name | string | 参数名称 |
| parameters[].type | string | 参数类型 (string/integer/number/boolean/object/array) |
| parameters[].description | string | 参数描述 |
| parameters[].required | boolean | 是否必填 |
| cli_endpoint | string | 调用端点，固定为 `/cli/run` |
| schema_url | string | 完整 Schema 地址 |

---

### 1. 同步运行任务

**端点**: `POST /cli/run`

提交任务并等待完成，返回结果或超时。

```bash
curl -X POST http://localhost:8066/cli/run \
  -H "Content-Type: application/json" \
  -d '{
    "box_id": "B202512141548",
    "web_input": {"message": "Hello"},
    "headless": true,
    "timeout": 60
  }'
```

**响应示例**:
```json
{
  "success": true,
  "autobox_task_id": "task_abc123",
  "box_id": "B202512141548",
  "status": "completed",
  "result": {"response": "Hello! How can I help?"},
  "elapsed_seconds": 5.23
}
```

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| box_id | string | 是 | 要运行的机器人ID |
| web_input | object | 否 | 传递给流程的输入数据 |
| headless | boolean | 否 | 是否无头模式运行，默认 true |
| timeout | integer | 否 | 超时时间(秒)，默认 300 |

---

### 2. 异步提交任务

**端点**: `POST /cli/submit`

提交一个后台执行的任务，任务状态会立即更新为 `running`。

```bash
curl -X POST http://localhost:8066/cli/submit \
  -H "Content-Type: application/json" \
  -d '{
    "box_id": "B202512141548",
    "web_input": {"message": "Hello"},
    "headless": true,
    "timeout": 300
  }'
```

**响应示例**:
```json
{
  "success": true,
  "autobox_task_id": "task_abc123",
  "box_id": "B202512141548",
  "status": "running",
  "message": "Task started, use /cli/status/task_abc123 to monitor"
}
```

---

### 3. 获取任务状态

**端点**: `GET /cli/status/{task_id}`

```bash
curl http://localhost:8066/cli/status/task_abc123
```

**响应示例**:
```json
{
  "success": true,
  "autobox_task_id": "task_abc123",
  "status": "running",
  "command": "flow run /path/to/box",
  "created_at": "2026-04-14T10:00:00",
  "started_at": "2026-04-14T10:00:01"
}
```

**状态值**: `pending`, `running`, `completed`, `failed`, `timeout`, `cancelled`

---

### 4. 获取任务结果

**端点**: `GET /cli/result/{task_id}`

```bash
curl http://localhost:8066/cli/result/task_abc123
```

**响应示例**:
```json
{
  "success": true,
  "autobox_task_id": "task_abc123",
  "status": "completed",
  "result": {"response": "Task completed successfully"},
  "error": null
}
```

---

### 5. 列出任务

**端点**: `GET /cli/list`

```bash
curl "http://localhost:8066/cli/list?status=completed&limit=10"
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 过滤状态: pending/running/completed/failed/timeout |
| limit | integer | 否 | 返回数量，默认 100 |

---

### 6. 取消任务

**端点**: `POST /cli/cancel/{task_id}`

```bash
curl -X POST http://localhost:8066/cli/cancel/task_abc123
```

---

### 7. 删除任务

**端点**: `DELETE /cli/task/{task_id}`

```bash
curl -X DELETE http://localhost:8066/cli/task/task_abc123
```

---

### 8. 获取任务日志

**端点**: `GET /cli/logs/{task_id}`

```bash
curl http://localhost:8066/cli/logs/task_abc123
```

---

## Python 客户端用法

```python
from app_flow_client import AppFlowClient

# 初始化（默认 localhost:8066）
client = AppFlowClient()

# 自定义地址
client = AppFlowClient(host="192.168.1.100", port=8066)

# 搜索 Box（按关键词）
boxes = client.search_boxes("翻译")
for box in boxes:
    print(f"{box['name']} ({box['id']})")
    for p in box['parameters']:
        print(f"  {p['name']}: {p['description']}")

# 同步运行（默认）
result = client.run(
    box_id="B202512141548",
    web_input={"message": "Hello"},
    timeout=60
)
print(result["result"])

# 异步提交 + 轮询等待
task = client.submit(box_id="B202512141548", web_input={"message": "Hello"})
task_id = task["autobox_task_id"]

# 等待完成
final_result = client.wait_for_completion(task_id, poll_interval=1.0)
print(final_result)

# 或手动轮询
while True:
    status = client.get_status(task_id)
    if status["status"] in ("completed", "failed", "timeout"):
        break
    time.sleep(1)
    
result = client.get_result(task_id)
```

---

## CLI 命令行用法

```bash
# 搜索 Box（按关键词）
python app_flow_client.py search --query "翻译"

# 搜索图片处理相关 Box
python app_flow_client.py search --query "图片处理"

# 同步运行
python app_flow_client.py run B202512141548 --web-input '{"message":"Hello"}' --timeout 60

# 异步提交
python app_flow_client.py submit B202512141548 --web-input '{"message":"Hello"}'

# 查询状态
python app_flow_client.py status --task-id task_abc123

# 获取结果
python app_flow_client.py result --task-id task_abc123

# 列出任务
python app_flow_client.py list --status completed

# 取消任务
python app_flow_client.py cancel --task-id task_abc123

# 删除任务
python app_flow_client.py delete --task-id task_abc123

# 获取日志
python app_flow_client.py logs --task-id task_abc123

# 指定远程地址
python app_flow_client.py --host 192.168.1.100 --port 8066 status --task-id task_abc123
```