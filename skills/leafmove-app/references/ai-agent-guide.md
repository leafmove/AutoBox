# AI 智能体应用开发指南

> 扩展 leafmove-app 技能，支持 AI 绘图/视频/音频/文本生成/工具调用

## 核心架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        前端层 (单HTML + SSE)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ 聊天界面    │  │ 工具面板    │  │ SSE 流式渲染               │ │
│  │ (多轮对话)  │  │ (绘图/视频) │  │ (EventSource + 渐进渲染)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                        API 层 (router.py)                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ POST /api/chat              → 创建对话任务                   │  │
│  │ GET  /api/chat/stream       → SSE 流式输出                   │  │
│  │ POST /api/images/generate   → AI 绘图任务                    │  │
│  │ POST /api/audio/transcribe  → 语音转文字                     │  │
│  │ POST /api/audio/speech      → 文字转语音                     │  │
│  │ POST /api/video/generate    → AI 视频生成                    │  │
│  │ GET  /api/task/{id}         → 查询任务状态                   │  │
│  │ POST /api/task/{id}/cancel  → 取消任务                       │  │
│  │ GET  /api/tools             → 获取可用工具列表               │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                        服务层 (ai_service.py)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ ChatService │  │ ImageService│  │ AudioService / VideoService │ │
│  │ (对话管理)  │  │ (绘图管理)  │  │ (音频/视频管理)             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                        引擎层 (新增模块)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │ ai_client   │  │task_manager │  │ tool_registry               │ │
│  │ (API封装)   │  │ (任务队列)  │  │ (工具注册)                  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                        数据层                                       │
│  ┌─────────────┐  ┌─────────────────────────────────────────────┐ │
│  │ SQLite      │  │ 会话上下文 / 任务状态 / 工具调用记录        │ │
│  └─────────────┘  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## 目录结构

```
boxes/_apps/ai_assistant/
├── appmanifest.json          # 应用清单
├── router.py                 # API 路由
├── ai_config.py              # 配置层
├── ai_database.py            # 数据层
├── ai_service.py             # 业务服务层
├── ai_client.py              # 🔥 AI 客户端封装（DMXAPI 统一调用）
├── task_manager.py           # 🔥 异步任务管理器
├── tool_registry.py          # 🔥 工具注册与执行框架
├── requirements.txt          # 依赖声明
├── data/
│   └── ai_assistant.db       # SQLite 数据库
└── frontend/
    └── index.html            # 单文件前端（聊天界面 + SSE）
```

## 模块说明

### 1. ai_client.py - AI 客户端统一封装

统一封装 DMXAPI 调用，支持多模态 AI 服务：

```python
# 核心功能
class AIClient:
    async def chat_stream()        # 流式文本生成
    async def chat()               # 非流式文本生成
    async def generate_image()     # AI 绘图
    async def transcribe_audio()   # 语音转文字
    async def generate_speech()    # 文字转语音
    async def generate_video()     # AI 视频生成
```

### 2. task_manager.py - 异步任务管理

处理长时间运行的 AI 任务：

```python
# 核心功能
class TaskManager:
    async def create_task()        # 创建异步任务
    async def get_task_status()    # 查询任务状态
    async def cancel_task()        # 取消任务
    async def update_progress()    # 更新进度
```

### 3. tool_registry.py - 工具注册框架

支持 AI 智能体调用外部工具：

```python
# 核心功能
class ToolRegistry:
    def register()                 # 注册工具
    async def execute()            # 执行工具
    def get_tools_for_prompt()     # 获取工具定义（给AI用）

# 内置工具示例
- WebSearchTool                   # 网页搜索
- ImageGenTool                    # AI 绘图
- CodeInterpreterTool             # 代码执行
- DatabaseQueryTool               # 数据库查询
```

## 前端特性

1. **聊天界面**：多轮对话、消息气泡、代码高亮
2. **SSE 流式渲染**：逐字显示、工具调用卡片、进度条
3. **明暗主题**：继承 leafmove-app 的 CSS 变量体系
4. **响应式布局**：适配不同屏幕尺寸
5. **工具面板**：快速调用绘图/视频/音频等 AI 能力

## API Key 获取方式

通过本地登录接口获取用户的 DMXAPI Key：

```python
# 优先级：
# 1. 从本地接口获取（用户已登录）
# 2. 从数据库获取（用户手动配置）
# 3. 提示用户输入
```
