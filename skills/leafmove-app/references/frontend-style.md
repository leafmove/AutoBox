# 前端UI/UX设计规范

## 核心原则

1. **单文件部署** — 所有CSS+JS内联到index.html，零构建步骤
2. **CSS变量驱动** — 所有颜色用语义变量，不硬编码十六进制值
3. **明暗双主题** — `:root` 暗色 + `[data-theme="light"]` 亮色，默认亮色
4. **图表双轨制** — 基础图表用 Chart.js；K线/热力/雷达/大屏用 ECharts，均通过 JS 动态读取CSS变量联动主题
5. **API相对路径** — 所有 fetch 调用使用 `./api/xxx` 相对路径，绝不硬编码端口
6. **组件级规范** — 所有 UI 元素必须使用本文件「组件级规范」中的标准结构，禁止自创样式

## 组件级规范（强制）

> 所有子应用 UI 必须使用以下标准组件结构，禁止自创。样式由 `assets/components.css` 提供（粘贴到 `<style>` 中，位于 dark-light-theme.css 之后）。这是保证多应用风格一致的唯一标准。

### 按钮

```html
<!-- ✅ 标准写法 -->
<button class="btn btn-primary">主要操作</button>
<button class="btn btn-secondary">次要操作</button>
<button class="btn btn-danger">删除数据</button>
<button class="btn btn-small">小按钮</button>
<button class="btn btn-primary" disabled>禁用</button>

<!-- ❌ 禁止写法：自创颜色/尺寸/内联样式 -->
<button style="background:blue;border-radius:5px;">不要这样</button>
```

| 规则 | 说明 |
|:---|:---|
| 主操作 | `btn btn-primary`（每屏仅 1 个） |
| 次操作 | `btn btn-secondary` |
| 危险操作 | `btn btn-danger`（红色，如删除；hover 变 `--danger-dark`） |
| 小尺寸 | `btn btn-small`（表格行内） |
| 图标按钮 | 文字 + emoji，如 `📥 导出` |

### 表单

```html
<!-- ✅ 标准写法 -->
<div class="form-group">
    <label>基金代码</label>
    <input class="input" placeholder="如 510500">
</div>
<div class="form-row">
    <div class="form-group">
        <label>开始日期</label>
        <input class="input" type="date">
    </div>
    <div class="form-group">
        <label>周期</label>
        <select class="select">
            <option>日线</option><option>周线</option>
        </select>
    </div>
    <button class="btn btn-primary">查询</button>
</div>

<!-- ❌ 禁止写法：无 label、无 class、硬编码边框 -->
<input style="border:1px solid #ddd;padding:4px;">
```

| 规则 | 说明 |
|:---|:---|
| 每个输入必须有 `label` | 可访问性 |
| 输入框 class | `input` / `select` / `textarea` |
| 表单+按钮行布局 | `form-row`（flex 自动换行） |
| 焦点态 | 边框变 primary + 外发光（已在 CSS 中） |

### 表格

```html
<!-- ✅ 标准写法：外层 .table-wrap 提供圆角边框+横向滚动 -->
<div class="table-wrap">
    <table>
        <thead><tr><th>代码</th><th class="td-num">涨跌幅</th></tr></thead>
        <tbody>
            <tr><td>510500</td><td class="td-num positive">+1.23%</td></tr>
        </tbody>
    </table>
</div>

<!-- ❌ 禁止写法：裸 table 无容器、数值无对齐 -->
<table><tr><td>510500</td><td>+1.23%</td></tr></table>
```

| 规则 | 说明 |
|:---|:---|
| 必须包 `table-wrap` | 圆角+边框+溢出滚动 |
| 数字列 | `td-num`（右对齐+等宽数字） |
| 涨跌色 | `positive`（红）/ `negative`（绿）/ `neutral` |
| 表头 | 用 `<th>`，CSS 自动着色 |
| 长表格滚动 | `.scroll-y`（max-height 400px） |

### 卡片

```html
<!-- ✅ 标准写法 -->
<div class="card">
    <div class="flex-between">
        <h3>标题</h3>
        <span class="tag tag-primary">标签</span>
    </div>
    <div class="mt-10">内容...</div>
</div>

<!-- 指标卡片：metrics-grid + metric-card -->
<div class="metrics-grid">
    <div class="metric-card">
        <div class="label">今日收益</div>
        <div class="value positive">+2.34%</div>
        <div class="sub">较昨日 +0.5%</div>
    </div>
</div>
```

| 规则 | 说明 |
|:---|:---|
| 区块容器 | `.card`（圆角16px，间距20px） |
| 指标卡容器 | `.metrics-grid`（auto-fit 网格） |
| 单个指标卡 | `.metric-card`（label/value/sub 三段式） |
| 标题+操作行 | `.flex-between` |

### 模态弹窗

```html
<!-- ✅ 标准写法：必须放在 body 末尾，所有 section 之外 -->
<div class="modal-overlay" id="myModal">
    <div class="modal">
        <h3>标题</h3>
        <p>内容...</p>
        <div class="flex gap-10" style="justify-content:flex-end;">
            <button class="btn btn-secondary" onclick="closeModal('myModal')">取消</button>
            <button class="btn btn-primary" onclick="doSave()">确定</button>
        </div>
    </div>
</div>

<script>
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
</script>
```

| 规则 | 说明 |
|:---|:---|
| 位置 | **body 末尾全局层级**，不在任何 `display:none` 容器内 |
| 打开/关闭 | `modal-overlay` 加/去 `show` class |
| 交互 | ESC 关闭 + 点击背景关闭（参考交互规范） |

### Toast 通知

```html
<!-- ✅ 标准写法：一个容器 + JS 动态插入 -->
<div class="toast-container" id="toastContainer"></div>

<script>
function showToast(msg, type) {  // type: success | error | info
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function() {
        t.classList.add('toast-out');
        setTimeout(function() { t.remove(); }, 300);
    }, 3000);
}
</script>
```

| 规则 | 说明 |
|:---|:---|
| 容器 | `.toast-container`（固定右上角，z-index 10002） |
| 类型 | `toast-success` / `toast-error` / `toast-info` |
| 自动消失 | 3 秒后淡出移除 |

### 标签 / 徽章

```html
<!-- ✅ 标准写法 -->
<span class="tag tag-primary">活跃</span>
<span class="tag tag-success">已达标</span>
<span class="tag tag-danger">风险</span>
<span class="tag tag-warning">待处理</span>
<span class="tag tag-info">信息</span>
<span class="tag tag-neutral">默认</span>
```

### Tab 切换

```html
<!-- ✅ 标准写法 -->
<div class="tabs" id="mainTabs">
    <button class="tab active" data-tab="overview">概览</button>
    <button class="tab" data-tab="detail">明细</button>
</div>

<script>
document.getElementById('mainTabs').addEventListener('click', function(e) {
    if (!e.target.classList.contains('tab')) return;
    this.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    switchTab(e.target.dataset.tab);  // 应用自定义：切换视图
});
</script>
```

### 分页

```html
<!-- ✅ 标准写法 -->
<div class="pagination">
    <button class="page-btn" onclick="goPage(-1)">‹</button>
    <button class="page-btn active">1</button>
    <button class="page-btn">2</button>
    <button class="page-btn" onclick="goPage(1)">›</button>
</div>
```

### 加载 / 空状态

```html
<!-- 加载中 -->
<div class="loading-mask"><span class="spinner"></span> 加载中...</div>

<!-- 空数据 -->
<div class="empty-state">
    <div class="empty-icon">📭</div>
    暂无数据，请调整筛选条件
</div>
```

### 颜色使用规范（中国市场惯例）

```css
.positive { color: var(--color-up); }   /* 红 = 涨 */
.negative { color: var(--color-down); } /* 绿 = 跌 */
.neutral  { color: var(--color-neutral); }
```

## CSS变量体系

### 暗色主题（:root）

> 🎨 **主题：Mint Quantum 薄荷量子**（2026-09-04 定稿）— 主色为薄荷绿 `#34d399`，跌色为深翠绿 `#10b981`，靠明度/饱和度区分。

```css
:root {
    --primary: #34d399;
    --primary-dark: #059669;
    --success: #10b981;
    --danger: #ef4444;
    --danger-dark: #dc2626;
    --warning: #f59e0b;
    --info: #3b82f6;
    --bg-dark: #071310;
    --bg-card: #0e1f18;
    --bg-hover: #1c332a;
    --text-primary: #f1f5f9;
    --text-secondary: #8aa89b;
    --border: #1c332a;
    --chart-grid: rgba(28, 51, 42, 0.35);
    --chart-text: #6b8a7e;
    --chart-tooltip-bg: rgba(7, 19, 16, 0.92);
    --chart-tooltip-title: #f1f5f9;
    --chart-tooltip-body: #8aa89b;
    --color-up: #ef4444;
    --color-down: #10b981;
    --color-neutral: #f59e0b;
    --heatmap-bg: #071310;
    --search-bg: #0e1f18;
    --shadow: rgba(0, 0, 0, 0.5);
}
```

### 亮色主题（[data-theme="light"]）

```css
[data-theme="light"] {
    --primary: #047857;
    --primary-dark: #065f46;
    --success: #059669;
    --danger: #dc2626;
    --danger-dark: #b91c1c;
    --warning: #d97706;
    --info: #2563eb;
    --bg-dark: #f0faf5;
    --bg-card: #ffffff;
    --bg-hover: #dcefe5;
    --text-primary: #0f1f18;
    --text-secondary: #5f7a6e;
    --border: #cfe3d8;
    --chart-grid: rgba(207, 227, 216, 0.6);
    --chart-text: #6b8a7e;
    --chart-tooltip-bg: rgba(255, 255, 255, 0.95);
    --chart-tooltip-title: #0f1f18;
    --chart-tooltip-body: #5f7a6e;
    --color-up: #dc2626;
    --color-down: #16a34a;
    --color-neutral: #d97706;
    --heatmap-bg: #dcefe5;
    --search-bg: #f6fbf8;
    --shadow: rgba(0, 0, 0, 0.1);
}
```

## 主题切换实现

### JS切换逻辑

```javascript
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('theme', newTheme);
    setupChartDefaults();
    setTimeout(() => applyThemeToCharts(), 50);
}

// 默认亮色
(function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved !== 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();
```

### Chart.js主题联动

```javascript
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        grid: s.getPropertyValue('--chart-grid').trim(),
        text: s.getPropertyValue('--chart-text').trim(),
        tooltipBg: s.getPropertyValue('--chart-tooltip-bg').trim(),
        tooltipTitle: s.getPropertyValue('--chart-tooltip-title').trim(),
        tooltipBody: s.getPropertyValue('--chart-tooltip-body').trim(),
        up: s.getPropertyValue('--color-up').trim(),
        down: s.getPropertyValue('--color-down').trim(),
    };
}

function setupChartDefaults() {
    const tc = getThemeColors();
    Chart.defaults.plugins.tooltip.backgroundColor = tc.tooltipBg;
    Chart.defaults.plugins.tooltip.titleColor = tc.tooltipTitle;
    Chart.defaults.plugins.tooltip.bodyColor = tc.tooltipBody;
    Chart.defaults.plugins.tooltip.borderColor = tc.grid;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.legend.labels.color = tc.text;
    Chart.defaults.color = tc.text;
}
```

## 布局规范

### 整体布局

- 最大宽度 1400px 居中
- 圆角统一 16px（大区块）/ 10px（小元素）/ 50px（标签）
- 间距统一 20px（大间隔）/ 10px（小间隔）
- 字体：系统字体栈 `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`

### 卡片网格

```css
.enhanced-metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 15px;
}
```

### 热力图网格

```css
/* 注意：列数必须等于实际元素数，否则溢出换行导致错位 */
.heatmap-grid {
    display: grid;
    grid-template-columns: 60px repeat(12, 1fr) 65px; /* 年份+12月+全年=14列 */
    gap: 3px;
}
```

## 交互规范

1. **悬停反馈** — 所有可交互元素 hover 时有 transition
2. **点击反馈** — 按钮点击有缩放/颜色变化
3. **加载状态** — spinner + 文字提示
4. **Toast通知** — 操作结果即时反馈（success/error/info）
5. **模态弹窗** — 全局层级（body末尾），ESC关闭，点击背景关闭

## 模态弹窗铁律

弹窗HTML必须放在所有模式section之外（body末尾），不能嵌套在任何 `display:none` 的容器内，否则切换模式时弹窗不可见。

## 颜色使用规范

### 中国市场惯例

- **红涨绿跌**（与美股相反）
- `.positive { color: var(--color-up); }` — 正收益/涨
- `.negative { color: var(--color-down); }` — 负收益/跌
- `.neutral { color: var(--color-neutral); }` — 中性

### 热力图颜色函数

```javascript
function heatmapColor(val) {
    const abs = Math.min(Math.abs(val), 10) / 10;
    if (val >= 0) return `rgba(239, 68, 68, ${0.15 + abs * 0.75})`; // 红
    return `rgba(16, 185, 129, ${0.15 + abs * 0.75})`; // 绿
}
```

## 前端模板替代方案

| 方案 | 优点 | 缺点 | 适用 |
|:---|:---|:---|:---|
| **单HTML** (默认) | 零构建，单文件部署 | 大型项目难维护 | 工具类应用 |
| **+ ECharts CDN** | 金融图表（K线/热力/雷达/大屏） | 体积大（~1MB，按需引入） | 数据看板/金融 |
| **+ Alpine.js CDN** | 响应式数据绑定，4.3KB | 需学指令语法 | 复杂表单/多视图联动 |
| **Vue3 CDN** | 组件化，响应式 | 需引入Vue | 中等复杂度 |
| **React CDN** | 生态丰富 | JSX需Babel | React技术栈 |
| **Tailwind CSS** | 原子化CSS | CDN体积大 | 快速原型 |
| **Canvas 2D** (Konva/Fabric/PixiJS) | 画布交互/流程图/粒子 | 学习成本 | 白板/编辑器/游戏 |
| **WebGL 3D** (Three.js) | 3D可视化 | 学习成本高 | 3D场景 |

> ⚠️ 图表选型铁律：**基础图用 Chart.js，金融复杂图用 ECharts**（K线/热力/雷达/地图/大屏/大数据量），不要用 Chart.js 硬画 K 线。

## ECharts 主题联动

详细模板见 `assets/chart-echarts.js`。核心：

```javascript
// 1. 页面加载时注册主题（颜色从 CSS 变量读取）
setupEchartsTheme();

// 2. 创建图表（统一入口，自动套用主题）
const chart = createEchart(document.getElementById('chart'), option);
allEcharts.push(chart);   // 注册到全局数组，主题切换时自动刷新

// 3. 主题切换时（与 Chart.js 共用 toggleTheme）
function toggleTheme() {
    // ... 切换 data-theme ...
    setupChartDefaults();   // Chart.js
    applyThemeToCharts();   // Chart.js 刷新
    applyThemeToEcharts();  // ECharts 刷新（内部重新注册主题）
}
```

## 复杂交互分级（画布/3D/游戏）

详细选型见 `references/tech-stack.md`「复杂交互选型」。快速判定：

| 级别 | 需求特征 | 技术 | 模板资产 | 典型应用 |
|:---|:---|:---|:---|:---|
| L1 | 表单+表格+图表 | DOM + 原生 JS | — | 工具类应用 |
| L2 | 复杂表单/多视图联动 | + Alpine.js CDN | — | 配置型工具 |
| L3 | 画布绘制/拖拽/流程图 | **Konva.js** | `konva-template.js` | 白板/编辑器 |
| L3 | 设计工具/图形编辑 | **Fabric.js** | `fabric-template.js` | 设计器/SVG编辑 |
| L3+ | 高性能渲染/粒子/轻游戏 | **PixiJS** | `pixijs-template.js` | 可视化/游戏 |
| L4 | 3D可视化 | **Three.js** | `three-template.js` | 3D数据展示 |
| L4+ | 2D游戏 | **Phaser 3** | `phaser-template.js` | 小游戏 |

> ⚠️ 复杂交互 iframe 注意项：
> 1. WebGL 上下文数量受限（浏览器约 16 个），应用间需协调，卸载时**必须**调用 `destroyThree()`/`destroyPhaser()`/`destroyPixi()` 释放 GPU
> 2. 动画一律用 `requestAnimationFrame`（PixiJS 用 `app.ticker`，Three.js 用 `startThreeLoop`），禁止 `setInterval` 驱动
> 3. 大数据量图表用 canvas 渲染器（ECharts 默认），不用 SVG
> 4. Konva/Fabric/Three/Phaser 均走 CDN，无构建步骤，仍保持单文件部署
> 5. 画布容器需显式高度（如 `style="width:100%;height:500px"`），否则 canvas 高度为 0

## 字体规范

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

- 标题：1.1rem / 600
- 正文：0.95rem / 400
- 标签：0.85rem / 400
- 表格：0.88rem / 400
- 注释：0.75rem / 400

## BoxApp 前端 API 路径规范

子应用前端运行在宿主 iframe 内，同源同端口，API 调用必须使用相对路径：

```javascript
// ✅ 正确：相对路径，同源自动携带 Cookie
const API_BASE = '';
fetch(`${API_BASE}/api/etf/list`)
// 或直接
fetch('./api/etf/list')

// ✅ 正确：绝对路径（含应用前缀）
fetch('/apps/etf_analyzer/api/etf/list')

// ❌ 错误：硬编码端口（子应用不再独立运行）
fetch('http://127.0.0.1:8765/api/etf/list')
const API_BASE = 'http://localhost:8765';
```

### 全局 API_BASE 定义（推荐放在 <script> 顶部）

```javascript
// 空字符串 = 同源，自动走宿主端口
const API_BASE = '';

// 统一请求函数
async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
}

// 使用
const data = await api('/api/etf/list');
const result = await api('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ code: '510500' }),
});
```
