# 后端技术选型方案

## Python 3.8 兼容性约束（强制）

宿主 AutoBox 运行在 Python 3.8 上，所有技术选型必须满足此约束。

### 核心包版本上限

| 包名 | Python 3.8 最高版本 | 原因 | 宿主已装版本 |
|:---|:---|:---|:---|
| `pandas` | 2.0.3 | 2.1+ 需 3.9+ | 2.0.3 ✅ |
| `numpy` | 1.24.4 | 1.25+ 需 3.9+ | 1.24.0 ✅ |
| `scipy` | 1.10.1 | 1.12+ 需 3.9+ | 1.10.1 ✅ |
| `matplotlib` | 3.7.5 | 3.8+ 需 3.9+ | ❌ 未安装 |
| `redis` | 5.0.8 | 5.1+ 需 3.9+ | ❌ 未安装 |
| `celery` | 5.3.6 | 5.4+ 需 3.9+ | ❌ 未安装 |
| `httpx` | 0.27.2 | 0.28+ 需 3.9+ | 已装 ✅ |
| `fastapi` | 0.115.12 | 当前兼容 | 0.115.12 ✅ |
| `pydantic` | 2.10.6 | 当前兼容 | 2.10.6 ✅ |
| `aiosqlite` | 0.20.0 | 当前兼容 | 0.20.0 ✅ |

> 安装新包时**必须**用 `--target` 指定宿主 site-packages 目录：
> `pip install {包名} --target "{宿主根目录}\build\AutoBox\app\site-packages"`

## 默认方案（推荐 — BoxApp 挂载模式）

| 层 | 技术 | 版本 | 理由 |
|:---|:---|:---|:---|
| 路由框架 | FastAPI APIRouter | 0.115+ | 异步高性能，Pydantic校验，宿主直接 include_router |
| 数据库 | SQLite + aiosqlite | 0.20+ | 零配置，异步读写，单文件，无需安装DB服务 |
| 计算引擎 | pandas + numpy + scipy | 2.0+/1.24+/1.10+ | 数据分析事实标准 |
| 数据序列化 | Pydantic | 2.10+ | 自动JSON序列化，NaN/Inf安全 |
| 前端 | 单HTML + Chart.js | - | 零构建步骤，CDN引入，单文件部署 |

> ⚠️ BoxApp 子应用**不使用**：pywebview（宿主已有窗口）、uvicorn.run（子应用不独立运行）、CORSMiddleware（宿主已有）、独立端口监听。

## 架构对比

### BoxApp 挂载模式（默认）

```
宿主 AutoBox (:8066)
  └── app.mount("/apps/{app_id}", sub_app)
        ├── sub_app.include_router(router)     ← 子应用路由
        └── sub_app.mount("/", StaticFiles)    ← 子应用前端
```

- 子应用是 APIRouter 模块，不创建 FastAPI 实例
- 共享宿主端口、CORS、用户身份（web_engine）
- importlib 动态加载，毫秒级挂载/卸载

### 独立运行模式（已被淘汰）

```
app = FastAPI()
uvicorn.run(app, port=8765)
```

- 需要独立端口、CORS、pywebview 窗口
- 无法被宿主自动发现和管理
- 不支持动态挂载/卸载

## 替代方案

### 路由框架替代

| 方案 | 优点 | 缺点 | 适用场景 |
|:---|:---|:---|:---|
| **FastAPI APIRouter** (默认) | 异步，自动文档，类型校验，宿主直接挂载 | 需了解 APIRouter 模式 | BoxApp 子应用 |
| Flask Blueprint | 简单成熟 | 同步阻塞，无自动文档 | 简单工具 |
| Starlette Router | 轻量ASGI | 需手动组装 | 极简API |

### 数据库替代

| 方案 | 优点 | 缺点 | 适用场景 |
|:---|:---|:---|:---|
| **SQLite** (默认) | 零配置，单文件 | 并发写限制 | 单机应用 |
| PostgreSQL | 强并发，JSON支持好 | 需安装服务 | 多用户Web应用 |
| DuckDB | 列式存储，OLAP快 | 较新，生态少 | 分析型查询 |
| TinyDB | 纯Python，JSON文档 | 性能弱 | 极简原型 |

### 前端替代

| 方案 | 优点 | 缺点 | 适用 |
|:---|:---|:---|:---|
| **单HTML + Chart.js** (默认) | 零构建，单文件部署，iframe友好 | 大型项目难维护 | 工具类应用/基础图表 |
| **单HTML + ECharts** | 金融图表（K线/热力/雷达/大屏/大数据量） | 体积大（~1MB） | 数据看板/金融分析 |
| **+ Alpine.js** | 响应式绑定，4.3KB，无构建 | 需学指令 | 复杂表单/多视图联动 |
| **Vue3 CDN** | 组件化，响应式 | 需引入Vue | 中等复杂度 |
| **React CDN** | 生态丰富 | JSX需Babel | React技术栈 |
| **Tailwind CSS** | 原子化CSS | CDN体积大 | 快速原型 |

> ⚠️ **图表选型铁律**：基础折线/柱状/饼图用 Chart.js（轻量）；K线/热力/雷达/地图/大屏/大数据量用 ECharts（金融事实标准，2025 实测对比共识）。**禁止用 Chart.js 硬画 K 线**。

## 图表双轨选型

| 场景 | 推荐 | 体积 | 模板资产 |
|:---|:---|:---|:---|
| 折线/柱状/饼图/散点 | Chart.js | ~70KB | `chart-theme.js` |
| K线/成交量/均线 | **ECharts** | ~1MB | `kline-template.js` |
| 热力图（年×月/任意网格） | **ECharts** | ~1MB | `heatmap-template.js` |
| 雷达图（多维度评分） | **ECharts** | ~1MB | `radar-template.js` |
| 仪表盘（饱和度/进度） | **ECharts** | ~1MB | `gauge-template.js` |
| 地图/大屏/大数据量 | **ECharts** | ~1MB | 按需配置 |
| 高度定制可视化 | D3.js | ~300KB | 按需 |

> 两者主题联动均通过 CSS 变量读取（`getThemeColors()`），切换主题时统一刷新：`applyThemeToCharts()` + `applyThemeToEcharts()`。

## 复杂交互选型（画布/3D/游戏）

按「交互复杂度分级」决策：L1 DOM → L2 Alpine → L3 Canvas 2D → L4 WebGL/游戏。

| 级别 | 需求 | 技术 | 体积(CDN) | 模板资产 | 适用场景 |
|:---|:---|:---|:---|:---|:---|
| **L1** | 表单/表格/图表 | DOM + 原生 JS | 0 | — | 工具类应用（默认） |
| **L2** | 复杂表单/多视图联动 | + Alpine.js | 4.3KB | — | 配置型工具 |
| **L3** | 画布绘制/拖拽/流程图 | **Konva.js** | ~120KB | `konva-template.js` | 白板/流程图/节点编辑器 |
| **L3** | 设计工具/图形编辑 | **Fabric.js** | ~230KB | `fabric-template.js` | 设计器/SVG编辑 |
| **L3+** | 高性能2D/粒子/轻游戏 | **PixiJS** | ~450KB | `pixijs-template.js` | 可视化/小游戏 |
| **L4** | 3D可视化 | **Three.js** | ~600KB | `three-template.js` | 3D数据展示 |
| **L4+** | 2D游戏 | **Phaser 3** | ~1.4MB | `phaser-template.js` | 小游戏 |

### 复杂交互 iframe 注意项（强制）

1. **WebGL 上下文数受限**（浏览器约 16 个），多个 3D 应用需协调，卸载时**必须**调用 `destroyThree()`/`destroyPhaser()`/`destroyPixi()` 释放 GPU（模板已内置 dispose 逻辑）
2. **动画一律 `requestAnimationFrame`**（PixiJS 用 `app.ticker`、Three.js 用 `startThreeLoop`），禁止 `setInterval` 驱动渲染
3. **大数据量图表用 canvas 渲染器**（ECharts 默认），不用 SVG
4. **Konva/Fabric/Three/Phaser 均走 CDN**，无构建步骤，保持单文件部署
5. **大 canvas 注意内存**：切换视图时调用 `destroy*()` 销毁画布实例，防内存泄漏
6. **画布容器必须显式高度**：`<div id="canvasBox" style="width:100%;height:500px;">`，否则 canvas 高度为 0 无法显示
7. **CDN 可用性兜底**：引入失败时页面应显示降级提示（如 `typeof Konva === 'undefined'` 时提示网络问题），避免白屏

## 密钥管理方案

### 方案1：环境变量（默认，推荐）

```python
# {prefix}_config.py
import os
from pathlib import Path

APP_DIR = Path(__file__).parent
DB_PATH = str(APP_DIR / "data" / "app_data.db")
TUSHARE_TOKEN = os.environ.get("TUSHARE_TOKEN", "")
```

### 方案2：.env文件

```python
# {prefix}_config.py
from dotenv import load_dotenv
load_dotenv()
TUSHARE_TOKEN = os.environ.get("TUSHARE_TOKEN", "")
```

### 方案3：本地配置文件（不提交到Git）

```python
# {prefix}_config.py
import json, os
from pathlib import Path

APP_DIR = Path(__file__).parent
config_path = APP_DIR / "local_config.json"
if config_path.exists():
    with open(config_path) as f:
        _cfg = json.load(f)
    TUSHARE_TOKEN = _cfg.get("tushare_token", "")
else:
    TUSHARE_TOKEN = os.environ.get("TUSHARE_TOKEN", "")
```

## 外部 API 调用规范

### API 节流包装器（必需）

外部 API（如 Tushare）有频率限制，必须包装节流+重试：

```python
import time

def call_api(func, *args, **kwargs):
    """API调用包装器：350ms节流 + 3次递增重试"""
    max_retries = 3
    for attempt in range(max_retries):
        time.sleep(0.35)  # 节流
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if "token" in str(e).lower() and attempt < max_retries - 1:
                wait = (attempt + 1) * 2  # 2s, 4s, 6s
                time.sleep(wait)
                continue
            raise
```

## 依赖管理

### requirements.txt 固定版本

```bash
# 获取当前环境精确版本
pip freeze > requirements.txt

# 新环境安装
pip install -r requirements.txt
```

> 注意：BoxApp 子应用的 requirements.txt 仅作文档声明，实际依赖由宿主环境提供。

## 打包说明

BoxApp 子应用不需要独立打包——它作为宿主 `boxes/_apps/` 目录下的模块运行，共享宿主的 Python 环境和依赖。

如需独立分发，可将整个 `boxes/_apps/{app_id}/` 目录打包为 zip。
