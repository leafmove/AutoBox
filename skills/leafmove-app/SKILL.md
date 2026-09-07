---
name: leafmove-app
description: 叶动独立应用编写技能。当用户想要从零构建一个带本地桌面GUI或Web前端的独立数据分析/工具型应用时使用。覆盖完整技术选型、后端分层架构设计、前端明暗主题UI/UX、数据缓存策略、密钥管理、部署打包的全流程方法论。触发词包括但不限于：构建独立应用、写个桌面应用、做个数据分析工具、全栈应用开发、叶动应用模式、快速搭建应用。只要上下文暗示需要前后端+数据库的完整应用项目，都应触发本Skill。
metadata:
  emoji: 🚀
---

# 叶动独立应用编写技能

## 核心理念

**一个 BoxApp 子应用 = appmanifest.json（清单契约） + router.py（APIRouter 路由） + 业务模块（配置+数据+计算） + frontend/（单HTML前端）**。

子应用不独立运行，而是通过 AutoBox 宿主的 `BoxAppLoader` 动态挂载到 `/apps/{app_id}/` 路径下，共享宿主端口、用户身份和中间件。

### 与传统独立应用的区别

| 维度 | 传统独立应用 | BoxApp 子应用（本技能） |
|:---|:---|:---|
| 后端实例 | `app = FastAPI()` + `uvicorn.run()` | `router = APIRouter()`（宿主挂载） |
| 端口 | 独立端口（如 :8765） | 共享宿主端口（:8066） |
| 用户认证 | 自建 | `request.app.state.web_engine` 天然共享 |
| CORS | 需自行配置 | 宿主统一处理，子应用不加 |
| 前端入口 | pywebview 窗口或独立服务 | 宿主 iframe 嵌入 `/apps/{app_id}/` |
| 发现机制 | 无 | `appmanifest.json` 自动扫描发现 |
| 动态加载 | 需重启 | `importlib` 毫秒级挂载/卸载 |

## 技术选型方案（默认）

详细选型对比见 `references/tech-stack.md`。默认配置：

| 层 | 技术 | 理由 |
|:---|:---|:---|
| 路由框架 | FastAPI APIRouter | 异步高性能，Pydantic校验，宿主直接 include_router |
| 数据库 | SQLite + aiosqlite | 零配置，异步读写，单文件部署 |
| 计算引擎 | pandas + numpy + scipy | 量化/数据分析事实标准 |
| 前端 | 单HTML + Chart.js/ECharts | 零构建步骤，CDN引入，单文件部署 |
| 密钥管理 | 环境变量 + .env | 不硬编码，不提交到版本库 |

> ⚠️ **不使用**：pywebview（宿主已有窗口）、uvicorn.run（子应用不独立运行）、CORSMiddleware（宿主已有）、独立端口监听。

### 图表与交互选型（速查）

**图表双轨制**：基础图（折线/柱状/饼图）用 Chart.js；K线/热力/雷达/地图/大屏用 ECharts。详见 `references/tech-stack.md`。

**交互复杂度分级**（生成前端前先定级）：

| 级别 | 需求 | 技术 |
|:---|:---|:---|
| L1 | 表单/表格/图表 | DOM + 原生 JS（默认） |
| L2 | 复杂表单/多视图联动 | + Alpine.js CDN |
| L3 | 画布/流程图/编辑器 | Konva.js / Fabric.js / PixiJS CDN |
| L4 | 3D可视化 / 2D游戏 | Three.js / Phaser CDN |

> 复杂交互（L3/L4）的 iframe 注意项见 `references/tech-stack.md`（WebGL 上下文限制、rAF 动画、canvas 渲染器等）。

## Python 3.8 兼容性规范（强制）

宿主 AutoBox 运行在 **Python 3.8** 环境上，所有生成的子应用代码**必须**兼容 Python 3.8。以下是编码时必须遵守的语法限制清单。

### ❌ 禁止使用的语法（Python 3.9+ / 3.10+ 特性）

| 禁止语法 | 引入版本 | 正确替代写法 |
|:---|:---|:---|
| `list[int]`, `dict[str, Any]`, `tuple[int, ...]` | 3.9+ | `from typing import List, Dict, Tuple` → `List[int]`, `Dict[str, Any]`, `Tuple[int, ...]` |
| `X \| Y`（联合类型管道） | 3.10+ | `from typing import Union` → `Union[X, Y]` 或 `Optional[X]` |
| `match / case` 语句 | 3.10+ | 使用 `if / elif / else` 链 |
| `typing.TypeAlias` | 3.10+ | 直接赋值 `MyType = str` 或不声明 |
| `typing.ParamSpec` | 3.10+ | 使用 `Callable[..., Any]` 替代 |
| `typing.Self` | 3.11+ | 返回类型用类名字符串 `"MyClass"` |
| `typing.Never` | 3.11+ | `NoReturn` |
| `tomllib` 标准库 | 3.11+ | `tomli`（第三方包）或 `toml` |

### ✅ Python 3.8 支持的特性（可放心使用）

| 特性 | 示例 |
|:---|:---|
| 海象运算符 `:=` | `if (n := len(data)) > 10: ...` |
| 仅位置参数 `/` | `def func(a, b, /, c): ...` |
| `f-string` `=` 调试 | `f"{x=}"` → 输出 `x=42` |
| `typing.TypedDict` | `class User(TypedDict): name: str` |
| `typing.Protocol` | `class Printable(Protocol): ...` |
| `typing.Literal` | `mode: Literal["r", "w"]` |
| `typing.Final` | `MAX_SIZE: Final[int] = 100` |

### 🔧 推荐做法：`from __future__ import annotations`

在每个 `.py` 文件**第一行**（docstring 之后）添加：

```python
"""模块说明"""
from __future__ import annotations
```

这会让 Python 3.8 将所有类型注解视为**字符串**（PEP 563），从而允许在注解中使用 `list[int]`、`X | Y` 等新语法而不会报错。

> ⚠️ **注意**：`from __future__ import annotations` 只影响**类型注解**，**不影响运行时代码**。`match/case` 等运行时语法仍然不能用。

### 📋 代码生成前自检清单

生成任何 Python 代码后，在写入文件前**必须**逐项检查：

- [ ] 没有 `match / case` 语句？
- [ ] 类型注解中没有裸 `list[...]` / `dict[...]` / `tuple[...]`（除非有 `from __future__ import annotations`）？
- [ ] 类型注解中没有 `X | Y` 管道语法（除非有 `from __future__ import annotations`）？
- [ ] 没有 `import tomllib`？
- [ ] 没有 `from typing import Self / ParamSpec / TypeAlias / Never`？
- [ ] 如果用了 `typing` 模块的高级类型，确认在 Python 3.8 中存在？

## 依赖检测机制（强制）

子应用依赖宿主环境的第三方包。**在编写任何代码之前，必须先检测所需包是否已安装在宿主的 site-packages 目录中**。

### 📂 site-packages 有效路径

```
{宿主根目录}/build/AutoBox/app/site-packages/
```

> 通过 **Step 0** 定位宿主根目录后，拼接 `build/AutoBox/app/site-packages/` 即为有效安装路径。
> 示例：`D:\Workspace\AutoBox\AutoBox\build\AutoBox\app\site-packages\`

### 🔍 检测方法

使用 `bash` 工具检查包是否已安装：

```bash
# 方法1：检查目录是否存在（最可靠）
dir /b "{宿主根目录}\build\AutoBox\app\site-packages\{包名}" 2>nul

# 方法2：用宿主Python尝试导入
cd "{宿主根目录}\build\AutoBox\app" && python -c "import {包名}; print({包名}.__version__)"
```

### 📦 宿主已安装核心包清单（Python 3.8 兼容验证版）

以下包**已确认安装**且版本经过 Python 3.8 兼容验证，可直接使用：

| 包名 | 已装版本 | Python 3.8 最高支持 | 用途 |
|:---|:---|:---|:---|
| `fastapi` | 0.115.12 | ✅ 0.115.x | Web 框架 |
| `starlette` | 0.44.0 | ✅ 0.44.x | ASGI 框架 |
| `uvicorn` | 0.33.0 | ✅ 0.33.x | ASGI 服务器（宿主用，子应用不用） |
| `pydantic` | 2.10.6 | ✅ 2.10.x | 数据校验 |
| `pandas` | 2.0.3 | ✅ 2.0.x（3.8 末班车） | 数据处理 |
| `numpy` | 1.24.0 | ✅ 1.24.x（≥1.25 需 3.9+） | 数值计算 |
| `scipy` | 1.10.1 | ✅ 1.10.x（≥1.12 需 3.9+） | 科学计算 |
| `aiosqlite` | 0.20.0 | ✅ 0.20.x | 异步 SQLite |
| `openpyxl` | 已装 | ✅ | Excel 读写 |
| `xlsxwriter` | 已装 | ✅ | Excel 写入 |
| `requests` | 已装 | ✅ | HTTP 客户端 |
| `aiohttp` | 已装 | ✅ | 异步 HTTP |
| `httpx` | 已装 | ✅ | HTTP 客户端 |
| `tushare` | 已装 | ✅ | A股金融数据 |
| `sqlalchemy` | 已装 | ✅ | ORM |
| `jinja2` | 已装 | ✅ | 模板引擎 |
| `lxml` | 已装 | ✅ | XML/HTML 解析 |
| `bs4` (BeautifulSoup) | 已装 | ✅ | HTML 解析 |
| `redis` | ❌ 未安装 | — | 需额外安装 |
| `pymysql` | 已装 | ✅ | MySQL 客户端 |

> 完整已装包列表可用 `dir /b "{宿主根目录}\build\AutoBox\app\site-packages"` 查看。

### ⚠️ 依赖缺失时的处理流程

当检测到子应用所需的包**未安装**时：

1. **暂停代码生成**，明确告知用户缺失的包名和用途
2. 提供安装命令，**必须**使用 `--target` 参数安装到宿主 site-packages：

```bash
# 安装到宿主 site-packages（必须用 --target）
pip install {包名} --target "{宿主根目录}\build\AutoBox\app\site-packages" --python-version 3.8 --only-binary=:all:

# 如果 --only-binary 失败（无预编译包），去掉该参数：
pip install {包名} --target "{宿主根目录}\build\AutoBox\app\site-packages"
```

3. **版本锁定**：安装时指定兼容 Python 3.8 的版本：

```bash
# 示例：安装 redis（指定 Python 3.8 兼容版本）
pip install "redis>=4.5,<5.1" --target "{宿主根目录}\build\AutoBox\app\site-packages"
```

4. 安装后**重新检测**确认导入成功，再继续代码生成

> 🚨 **严禁**直接 `pip install {包名}` 安装到系统 Python — 必须安装到宿主 site-packages 目录，否则子应用运行时找不到包。

### 📋 常见包的 Python 3.8 最高兼容版本速查

| 包名 | Python 3.8 最高版本 | 原因 |
|:---|:---|:---|
| `pandas` | 2.0.3 | 2.1+ 需要 Python 3.9+ |
| `numpy` | 1.24.4 | 1.25+ 需要 Python 3.9+ |
| `scipy` | 1.10.1 | 1.12+ 需要 Python 3.9+ |
| `matplotlib` | 3.7.5 | 3.8+ 需要 Python 3.9+ |
| `redis` | 5.0.8 | 5.1+ 需要 Python 3.9+ |
| `celery` | 5.3.6 | 5.4+ 需要 Python 3.9+ |
| `httpx` | 0.27.2 | 0.28+ 需要 Python 3.9+ |
| `pydantic` | 2.10.6 | 当前版本兼容 |
| `fastapi` | 0.115.12 | 当前版本兼容 |

## 应用分层架构

### BoxApp 标准目录结构

```
boxes/_apps/{app_id}/
├── appmanifest.json          # 📋 应用清单（宿主发现的唯一契约，必需）
├── router.py                 # 🔌 入口：APIRouter 实例（必需）
├── {prefix}_config.py        # ⚙️ 配置层：Token/常量/路径
├── {prefix}_database.py      # 💾 数据层：SQLite CRUD + 缓存管理
├── {prefix}_service.py       # 🧮 计算引擎：所有业务计算逻辑
├── requirements.txt          # 📦 依赖声明（仅文档作用）
├── data/
│   └── app_data.db           # SQLite 数据库文件
└── frontend/
    └── index.html            # 单文件前端（CSS+JS全内联）
```

**`{prefix}` 命名规则**：为避免多应用 `sys.path` 冲突，模块文件名必须加应用前缀。例如 `etf_analyzer` 应用用 `etf_config.py`、`etf_database.py`、`etf_service.py`。

### 后端四层模型

```
router.py              ← API层：APIRouter路由 + get_web_engine依赖 + 缓存读写 + 数据组装
{prefix}_service.py    ← 计算引擎层：所有业务计算逻辑（pandas/numpy）
{prefix}_database.py   ← 数据层：SQLite CRUD + 缓存管理
{prefix}_config.py     ← 配置层：Token/常量/路径定义（使用 Path(__file__).parent）
```

**铁律**：
1. **router.py 用 APIRouter()** — 不用 FastAPI()，不加 prefix（宿主挂载时统一处理）
2. **计算逻辑全部在后端** — 前端不做任何数学计算，只渲染
3. **API层不做计算** — 只负责路由、缓存检查、调用计算函数
4. **计算函数是纯函数** — 输入数据→输出结果，无副作用，可测试
5. **数据层只管存取** — 不含业务逻辑
6. **不自建认证** — 通过 `Depends(get_web_engine)` 获取用户身份
7. **不加 CORS / 不调 uvicorn** — 宿主统一处理
8. **Python 3.8 语法兼容** — 所有 .py 文件首行加 `from __future__ import annotations`，禁止 match/case、裸泛型、X|Y 联合类型等 3.9+ 语法（详见"Python 3.8 兼容性规范"）
9. **依赖先检后用** — 任何 import 的第三方包，必须先通过"依赖检测机制"确认已安装在宿主 site-packages 中

### 前端单文件模型

```
frontend/index.html  ← 一个HTML文件包含全部CSS+JS
```

**铁律**：
1. **CSS用语义变量** — 所有颜色用 `var(--xxx)`，不硬编码
2. **组件用标准结构** — 按钮/表单/表格/卡片/弹窗/Toast 必须用 `references/frontend-style.md`「组件级规范」的标准写法 + `assets/components.css` 样式，禁止自创
3. **Chart.js用全局默认值** — 通过 `Chart.defaults` 统一设置颜色
4. **ECharts用注册主题** — 通过 `setupEchartsTheme()` 注册 + `createEchart()` 创建，详见 `assets/chart-echarts.js`
5. **主题切换零重绘** — CSS变量 + `data-theme` 属性，浏览器原生切换
6. **模态弹窗放全局层级** — 在所有模式section之外，避免被 display:none 隐藏
7. **API路径用相对路径** — `fetch('./api/xxx')` 或 `fetch('/apps/{app_id}/api/xxx')`，绝不硬编码端口

## appmanifest.json（应用清单标准）

这是宿主发现和加载子应用的**唯一契约**，每个子应用根目录必须放置此文件。

```json
{
  "id": "etf_analyzer",
  "name": "ETF数据分析平台",
  "version": "1.0.0",
  "icon": "📊",
  "description": "ETF数据分析、组合回测与风险评估",

  "entry": "router.py",
  "router_attr": "router",

  "frontend": "frontend",

  "requires_web_engine": true,
  "env_required": ["TUSHARE_TOKEN"],

  "auto_start": true
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|:---|:---|:---|:---|:---|
| `id` | string | ✅ | — | 应用唯一标识，用于 URL 前缀 `/apps/{id}` 和管理 API |
| `name` | string | ✅ | — | 显示名称 |
| `version` | string | ❌ | "1.0.0" | 版本号 |
| `icon` | string | ❌ | "📦" | Emoji 图标 |
| `description` | string | ❌ | "" | 简短描述 |
| `entry` | string | ❌ | "router.py" | 入口文件名（相对于应用目录） |
| `router_attr` | string | ❌ | "router" | 入口文件中导出的 APIRouter 变量名 |
| `frontend` | string | ❌ | "frontend" | 前端静态文件目录名 |
| `requires_web_engine` | bool | ❌ | true | 是否需要访问 web_engine（用户上下文） |
| `env_required` | string[] | ❌ | [] | 需要的环境变量列表（启动时校验） |
| `auto_start` | bool | ❌ | true | 宿主启动时是否自动挂载 |

## router.py 编写规范

```python
"""子应用 router.py 标准模板

关键规范：
1. 使用 APIRouter() 而非 FastAPI()，不加 prefix
2. 需要用户身份时，通过 Depends(get_web_engine) 获取
3. 不要添加 CORS 中间件（宿主已有）
4. 不要调用 uvicorn.run()（子应用不独立运行）
5. 路由路径用相对路径如 /api/xxx，挂载后实际路径为 /apps/{app_id}/api/xxx
6. Python 3.8 兼容：首行必须加 from __future__ import annotations
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

# 导入同目录业务模块（模块名已加前缀，避免 sys.path 冲突）
from {prefix}_config import DB_PATH, TUSHARE_TOKEN
from {prefix}_database import db
from {prefix}_service import app_service

router = APIRouter()


def get_web_engine(request: Request):
    """从宿主获取用户上下文 —— 所有子应用统一用这个

    web_engine 对象包含：
    - web_engine.phone     → 用户手机号（唯一标识）
    - web_engine.username  → 用户名
    - web_engine.level     → 用户等级
    - web_engine.allow     → 权限字符串
    - web_engine.is_login  → 登录状态
    - web_engine.valid_date → 有效期
    """
    return request.app.state.web_engine


@router.get("/api/list")
async def get_list(web_engine=Depends(get_web_engine)):
    """普通接口 — 可通过 web_engine 获取用户身份"""
    user_phone = web_engine.phone
    result = app_service.get_list()
    return {"data": result}


@router.post("/api/favorites")
async def add_favorite(code: str, web_engine=Depends(get_web_engine)):
    """需要用户隔离的接口 — 绑定 web_engine.phone"""
    user_phone = web_engine.phone
    db.add_favorite(user_phone, code)
    return {"status": "ok"}
```

### URL 路由映射

```
router.py 中定义              挂载后实际路径
─────────────────────────────────────────────────────
GET  /api/list          →   GET  /apps/{app_id}/api/list
POST /api/favorites     →   POST /apps/{app_id}/api/favorites
GET  /api/data          →   GET  /apps/{app_id}/api/data
```

前端通过相对路径访问：`fetch('./api/list')` 自动解析为 `/apps/{app_id}/api/list`。

## 前端 API 路径规范

```javascript
// ✅ 正确：使用相对路径，同源自动携带 Cookie
fetch('./api/etf/list')
fetch('/apps/etf_analyzer/api/etf/data')

// ✅ 正确：使用空字符串BASE（同源）
const API_BASE = '';
fetch(`${API_BASE}/api/etf/list`)

// ❌ 错误：硬编码端口（子应用不再独立运行在某个端口）
fetch('http://127.0.0.1:8765/api/etf/list')
fetch('http://localhost:8765/api/etf/data')
```

## 数据缓存三层策略

```
请求进来 → Layer 2: 计算结果缓存(calc_cache表, JSON+TTL)
           │ 命中 → 直接返回(0.003s)
           │ 未命中 ↓
           Layer 1: 基础数据(daily等表, 永久存储+增量更新)
           │ 本地有且够新 → 读DB计算(0.2s)
           │ 本地无/过期 ↓
           Layer 0: 远程API(Tushare等) → 拉取→存DB→再从DB读
```

- **TTL差异化**：不同缓存类型不同过期时间（指标4h/回测1h/持仓12h）
- **降级容错**：远程API失败时返回DB旧数据，不报错
- **增量拉取**：只拉缺失日期的数据，不重复请求
- **API节流**：外部API（如Tushare）需包装 `call_api()` 函数，350ms节流+3次递增重试

## 密钥与权限管理

1. **环境变量注入**：`TUSHARE_TOKEN` 通过 `os.environ.get()` 读取
2. **config.py集中管理**：所有配置在 `{prefix}_config.py` 中，不散落在各文件
3. **路径用相对路径**：`Path(__file__).parent` 确保迁移后路径正确
4. **不提交密钥**：`.env` 文件加入 `.gitignore`
5. **用户身份从宿主获取**：`web_engine.phone` 做用户隔离，不自建认证

### {prefix}_config.py 模板

```python
"""配置层 — Token/路径/常量"""
from __future__ import annotations

import os
from pathlib import Path

# 应用目录（router.py 所在目录）
APP_DIR = Path(__file__).parent

# 数据库路径（相对于应用目录）
DB_PATH = str(APP_DIR / "data" / "app_data.db")

# 外部 API Token（从环境变量获取）
TUSHARE_TOKEN = os.environ.get("TUSHARE_TOKEN", "")

# 缓存TTL（秒）
CACHE_TTL_METRICS = 4 * 3600    # 指标缓存 4h
CACHE_TTL_BACKTEST = 3600       # 回测缓存 1h
CACHE_TTL_HOLDINGS = 12 * 3600  # 持仓缓存 12h
```

## 明暗主题UI/UX设计

详细设计规范见 `references/frontend-style.md`。`assets/` 目录包含可复用模板。

核心要点：
1. **CSS变量驱动**：`:root` 暗色 + `[data-theme="light"]` 亮色
2. **语义化变量**：`--bg-dark/--bg-card/--text-primary/--chart-grid` 等
3. **Chart.js联动**：`getThemeColors()` 函数动态读取CSS变量 + `setupChartDefaults()` 全局默认值
4. **localStorage记忆**：用户选择持久化，默认亮色
5. **切换无闪烁**：CSS变量切换是浏览器原生能力，无JS重绘

## 开发流程

### Step 0: 定位宿主目录

开发子应用前，**必须先找到 AutoBox 宿主的真实安装路径**。按以下优先级依次尝试：

1. **查环境变量**（最快）
   → 调用 `env_config` 查询 `AUTOBOX_HOME`
   → 若已有值，直接作为宿主根目录，跳到第 4 步

2. **搜索常见位置**（首次兜底）
   → 依次检查以下路径，找到包含 `core\server\api.py` 的目录即为宿主根目录：
   - `D:\Workspace\AutoBox\AutoBox`
   - `C:\Workspace\AutoBox\AutoBox`
   - `D:\AutoBox\AutoBox`
   - `C:\AutoBox\AutoBox`
   - `~/AutoBox/AutoBox`

3. **询问用户**（最后手段）
   → 以上都找不到时，直接问用户 AutoBox 装在哪个目录
   → 拿到路径后，调用 `env_config` 设置 `AUTOBOX_HOME`，下次不用再问

4. **确认子应用目录**
   → 宿主根目录下的 `boxes/_apps/` 即为子应用部署目录
   → 后续所有 Step 中的 `boxes/_apps/` 均指 `{宿主根目录}/boxes/_apps/`

> ⚠️ **每次开发新应用时都应执行 Step 0**，确保路径仍然有效（用户可能重装或迁移过 AutoBox）。

### Step 0.5: Python 3.8 兼容性校验与依赖检测（强制）

在明确需求之前，**必须先执行此步骤**，确保后续生成的代码不会因环境不兼容而失败。

#### 1. 确认 site-packages 路径

```bash
# 基于 Step 0 获取的宿主根目录，拼接 site-packages 路径
# 实际路径：{宿主根目录}/build/AutoBox/app/site-packages/
dir /b "{宿主根目录}\build\AutoBox\app\site-packages" 2>nul | findstr /i "fastapi pandas pydantic"
# 如果有输出，说明路径正确
```

#### 2. 盘点子应用所需依赖

根据用户需求，列出所有需要 import 的第三方包，然后逐个检测：

```bash
# 批量检测（示例：检测 redis 和 matplotlib）
cd "{宿主根目录}\build\AutoBox\app" && python -c "
packages = ['redis', 'matplotlib']
for pkg in packages:
    try:
        mod = __import__(pkg)
        ver = getattr(mod, '__version__', 'unknown')
        print(f'✅ {pkg}: {ver}')
    except ImportError:
        print(f'❌ {pkg}: 未安装')
"
```

#### 3. 处理检测结果

- **全部已安装** → 继续 Step 1
- **有缺失包** → 暂停开发，告知用户缺失包列表，提供 `--target` 安装命令（见上方"依赖缺失时的处理流程"），等用户确认安装完成后再继续
- **版本不兼容** → 提醒用户降级到 Python 3.8 兼容版本

#### 4. 生成兼容性声明

在子应用的 `requirements.txt` 中记录依赖及版本约束：

```txt
# requirements.txt — Python 3.8 兼容
# 仅作文档声明，实际依赖由宿主 site-packages 提供
fastapi>=0.110,<0.116
pandas>=2.0,<2.1  # 2.1+ 需要 Python 3.9+
numpy>=1.24,<1.25  # 1.25+ 需要 Python 3.9+
aiosqlite>=0.19,<0.21
```

### Step 1: 明确需求
- 列出核心功能模块（通常3-5个）
- 每个模块的输入/输出/数据源
- 确定应用 ID（如 `etf_analyzer`）和模块前缀（如 `etf_`）

### Step 2: 创建目录结构

在宿主的 `boxes/_apps/` 下创建应用目录（路径来自 Step 0）：

```
{宿主根目录}/boxes/_apps/{app_id}/
├── data/
└── frontend/
```

### Step 3: 编写 appmanifest.json
- 填写 id / name / entry / frontend / env_required / auto_start
- 确保 `id` 与目录名一致
- 确保 `entry` 指向 router.py，`router_attr` 为 "router"

### Step 4: 后端开发（自底向上）
1. **{prefix}_config.py** — 配置 Token/DB_PATH/常量
2. **{prefix}_database.py** — 建表 + init_db + CRUD
3. **{prefix}_service.py** — 计算引擎，所有 calculate_xxx 函数
4. **router.py** — APIRouter + get_web_engine + 路由定义

### Step 5: 前端开发
1. 从 `assets/` 复制前端模板（dark-light-theme.css + components.css + chart-theme.js，如用 ECharts 则 + chart-echarts.js）
2. 按 `references/frontend-style.md`「组件级规范」使用标准组件（按钮/表单/表格/卡片/弹窗/Toast），不自创样式
3. 按需求定级（L1-L4）选择图表/交互方案：基础图 Chart.js，金融复杂图 ECharts（K线/热力/雷达/仪表盘用对应模板）
4. **引入 CDN 库**（⚠️ 高频遗漏点）：在 `<script>` 前添加所用库的 CDN 引用，如：
   - 图表：`<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>` 或 ECharts
   - 画布：`<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>` 等
   - **每用一个库，必须有一个对应的 `<script src>` 引入**，否则页面 UI 正常但功能静默失效（见 fund_poster 案例）
5. 逐个模块对接 API（**使用相对路径** `./api/xxx`）
6. 添加明暗主题切换（Chart.js 与 ECharts 统一联动）
7. 模态弹窗放在 body 末尾全局层级

### Step 6: 测试与验证

1. 确认应用目录已在宿主 `boxes/_apps/` 下（Step 2 已创建，若在别处开发则复制过去）
2. 重启宿主或调用 `POST /api/boxapps/{app_id}/mount`（宿主端口默认 :8066）
3. 验证清单：
   - [ ] `GET /api/boxapps/scan` 能发现应用
   - [ ] `GET /apps/{app_id}/` 返回前端页面
   - [ ] `GET /apps/{app_id}/api/xxx` 返回数据
   - [ ] `web_engine.phone` 能获取用户身份
   - [ ] 卸载后 `/apps/{app_id}/` 返回 404
   - [ ] 重新挂载后代码修改生效
   - [ ] Python 3.8 兼容性：用宿主 Python 执行 `python -c "import {prefix}_config; import {prefix}_database; import {prefix}_service"` 无报错
   - [ ] **前端 CDN 完整性**（⚠️ 新增，防静默失效）：浏览器控制台执行 `typeof 所用库名` 确认非 undefined（如 `typeof fabric`、`typeof echarts`、`typeof THREE`、`typeof Phaser`、`typeof Konva`），并在页面中实际点击核心功能按钮，确认对象数/数据有变化（不能只看页面渲染正常）

## 独立应用迁移为 BoxApp（5步改造）

已有 FastAPI 独立应用迁移为 BoxApp 子应用的标准流程：

### Step 1: api.py → router.py
```python
# 改造前
from fastapi import FastAPI
app = FastAPI()
app.add_middleware(CORSMiddleware, ...)

@app.get("/api/xxx")
async def get_xxx():
    ...

if __name__ == "__main__":
    uvicorn.run(app, port=8765)

# 改造后
from fastapi import APIRouter, Depends, Request
router = APIRouter()

def get_web_engine(request: Request):
    return request.app.state.web_engine

@router.get("/api/xxx")
async def get_xxx(web_engine=Depends(get_web_engine)):
    ...

# 删除 CORSMiddleware、uvicorn.run、if __name__
# 删除返回 HTML 的根路由（由 StaticFiles 处理）
```

### Step 2: 模块名加前缀
- `config.py` → `{prefix}_config.py`
- `database.py` → `{prefix}_database.py`
- `service.py` → `{prefix}_service.py`
- router.py 中的 import 同步修改

### Step 3: config.py 调整
- 删除 `API_PORT`（不再需要独立端口）
- `DB_PATH` 改为 `Path(__file__).parent / "data" / "app_data.db"`

### Step 4: 前端 API 路径
- 全局搜索 `8765`/`localhost`/`127.0.0.1`
- 替换为相对路径 `./api/xxx` 或空字符串 BASE

### Step 5: 创建 appmanifest.json 并部署

- 按标准模板填写，确保 id 与目录名一致
- 将整个应用目录放到宿主的 `boxes/_apps/` 下（路径通过 Step 0 定位）
- 调用 `POST /api/boxapps/{app_id}/mount` 热挂载，无需重启宿主

### 迁移验证清单

- [ ] `appmanifest.json` 存在且 JSON 格式正确
- [ ] `router.py` 中 `router = APIRouter()` 变量名与 manifest 的 `router_attr` 一致
- [ ] `router.py` 中无 `FastAPI()`、无 `CORSMiddleware`、无 `uvicorn.run()`
- [ ] `router.py` 中有 `get_web_engine` 函数
- [ ] `router.py` 首行有 `from __future__ import annotations`
- [ ] 所有 `.py` 文件无 `match/case` 语句
- [ ] 所有 `.py` 文件类型注解无裸 `list[...]`/`dict[...]`/`X | Y`（除非有 `from __future__ import annotations`）
- [ ] 所有 import 的第三方包已通过依赖检测（存在于宿主 site-packages）
- [ ] `requirements.txt` 中版本约束符合 Python 3.8 兼容要求
- [ ] 前端无硬编码端口（搜索原端口号确认）
- [ ] `config.py` 中 `DB_PATH` 使用 `Path(__file__).parent`
- [ ] 宿主启动后 `GET /api/boxapps/scan` 能发现应用
- [ ] `GET /apps/{app_id}/` 能返回前端页面
- [ ] `GET /apps/{app_id}/api/xxx` 能返回数据

## 前端模板资源

`assets/` 目录包含可复用的前端模板：

### 基础模板（所有应用必用）
- `dark-light-theme.css` — 明暗主题CSS变量完整定义（粘贴到 `<style>` 开头）
- `components.css` — 标准组件样式（按钮/表单/表格/卡片/弹窗/Toast/Tab/分页等，粘贴到 `<style>`，位于主题之后）
- `chart-theme.js` — Chart.js主题联动代码（getThemeColors + setupChartDefaults + toggleTheme）

### 图表模板（按需）
- `chart-echarts.js` — ECharts主题联动（setupEchartsTheme + createEchart + applyThemeToEcharts）
- `kline-template.js` — K线图（蜡烛图+成交量+均线，金融场景）
- `heatmap-template.js` — 热力图（年×月 或 任意网格，红涨绿跌）
- `radar-template.js` — 雷达图（多维度评分对比）
- `gauge-template.js` — 仪表盘（饱和度/进度/健康度）

### 复杂交互（按需，L3/L4 分级）
- `konva-template.js` — **Konva.js**（L3 画布）：白板/流程图/节点编辑器，可拖拽节点+连线+滚轮缩放
- `fabric-template.js` — **Fabric.js**（L3 设计工具）：图形编辑器/设计器，选中缩放旋转+属性面板联动+撤销重做+JSON持久化
- `pixijs-template.js` — **PixiJS**（L3+ 高性能2D）：粒子系统/散点可视化，数千对象流畅
- `three-template.js` — **Three.js**（L4 3D）：3D柱状图/散点/模型展示，含轨道控制+点击拾取+完整销毁
- `phaser-template.js` — **Phaser 3**（L4+ 2D游戏）：玩家移动+收集物碰撞+计分基类，零素材（Graphics 绘图）

> 图表铁律：**基础图 Chart.js，金融复杂图 ECharts**。不要用 Chart.js 硬画 K 线/热力图。
> 交互铁律：**L3/L4 先定级再选型**（见 tech-stack.md），卸载时必须调用 `destroy*()` 释放 GPU 资源。

## 参考文档

- `references/tech-stack.md` — 后端技术选型详细对比和替代方案
- `references/frontend-style.md` — 前端UI/UX设计规范和组件库
- `references/ai-agent-guide.md` — 🔥 **AI 智能体应用开发指南**（支持对话、绘图、语音、视频、工具调用）

## AI 智能体应用支持

本技能已扩展支持 AI 智能体应用开发，包括：

### 核心能力

| 能力 | 说明 | 模块 |
|:---|:---|:---|
| 🤖 AI 对话 | 流式文本生成、多轮对话 | `ai_client.py` |
| 🎨 AI 绘图 | DALL-E 3、Stable Diffusion | `ai_client.py` |
| 🎤 语音转文字 | Whisper 语音识别 | `ai_client.py` |
| 🔊 文字转语音 | TTS 语音合成 | `ai_client.py` |
| 🎬 AI 视频 | Sora 视频生成 | `ai_client.py` |
| 🔧 工具调用 | Agent 工具注册与执行 | `tool_registry.py` |
| ⏱️ 异步任务 | 长时间任务队列管理 | `task_manager.py` |
| 📡 SSE 流式 | 实时流式输出 | `router.py` |

### 模板位置

AI 智能体应用模板位于：
```
templates/ai-assistant/
├── appmanifest.json
├── router.py
├── ai_config.py
├── ai_database.py
├── ai_service.py
├── ai_client.py
├── task_manager.py
├── tool_registry.py
├── requirements.txt
└── frontend/
    └── index.html
```

### 使用方法

1. 复制 `templates/ai-assistant/` 目录到 `boxes/_apps/`
2. 修改 `appmanifest.json` 中的 `id` 和 `name`
3. 在 `ai_config.py` 中配置 API Key 获取逻辑
4. 重启宿主或调用挂载 API

详见 `references/ai-agent-guide.md`。

## 演进记录

| 日期 | 版本 | 变更内容 |
|:---|:---:|:---|
| 2026-07-14 | v1.0 | 初始创建，独立应用模式（FastAPI + pywebview + uvicorn） |
| 2026-07-15 | v2.0 | 架构升级为 BoxApp 挂载模式，对齐 autobox-boxapp-mount-requirements.md |
| 2026-07-16 | v2.1 | 品牌统一：中文"叶动"、英文"leafmove" |
| 2026-08-01 | **v2.2** | **四维度增强**：① 组件级规范（方案C，frontend-style.md + components.css）② 图表双轨制（Chart.js 基础 + ECharts 金融，新增 chart-echarts.js + K线/热力/雷达/仪表盘模板）③ 复杂交互分级 L1-L4（新增 konva/fabric/pixijs/three/phaser 5 个示例模板 + iframe 注意项）④ 接口与数据库调用保持不变 |
| 2026-08-12 | **v2.3** | **🔥 AI 智能体扩展**：新增 AI 应用开发支持（对话/绘图/语音/视频/工具调用），新增 `ai_client.py`、`task_manager.py`、`tool_registry.py` 三个核心引擎模块，新增 SSE 流式输出支持，新增聊天界面前端模板 |
