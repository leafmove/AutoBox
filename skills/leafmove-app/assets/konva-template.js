/* ===== Konva.js 模板（L3 Canvas 2D：白板 / 流程图 / 节点编辑器） ===== */
/* CDN 引入（放在 <script> 标签中，Konva 之后）：
   <script src="https://unpkg.com/konva@9/konva.min.js"></script>
   BoxApp 子应用：API 使用相对路径，API_BASE 为空字符串（同源）
   适用场景：拖拽节点、连线、缩放平移的画布应用（流程图编辑器、白板、拓扑图） */

// ===== 主题色（复用 Chart.js 的 CSS 变量） =====
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        bg: s.getPropertyValue('--bg-card').trim() || '#0e1f18',
        border: s.getPropertyValue('--border').trim() || '#1c332a',
        primary: s.getPropertyValue('--primary').trim() || '#34d399',
        text: s.getPropertyValue('--text-primary').trim() || '#f1f5f9',
        textSecondary: s.getPropertyValue('--text-secondary').trim() || '#8aa89b',
        grid: s.getPropertyValue('--chart-grid').trim() || 'rgba(51,65,85,0.3)',
    };
}

// ===== 创建一个可交互 Stage（统一入口） =====
// containerId: 容器 div 的 id；width/height: 画布尺寸（可传 0 自动取容器大小）
// 返回 Konva.Stage；已注册到 allKonvaStages 供主题切换刷新
let allKonvaStages = [];

function createKonvaStage(containerId, width, height) {
    const container = document.getElementById(containerId);
    if (!container) return null;
    const w = width || container.clientWidth || 800;
    const h = height || container.clientHeight || 500;
    const stage = new Konva.Stage({
        container: containerId,
        width: w,
        height: h,
    });
    allKonvaStages.push(stage);
    return stage;
}

// ===== 背景网格层（可选，辅助对齐） =====
// 在 stage 上添加一个带网格的背景层，返回 layer
function addGridLayer(stage) {
    const tc = getThemeColors();
    const layer = new Konva.Layer();
    stage.add(layer);

    // 网格线（间距 30px）
    const grid = new Konva.Line({
        points: [], stroke: tc.grid, strokeWidth: 1,
    });
    layer.add(grid);
    const points = [];
    const w = stage.width(), h = stage.height();
    for (let x = 0.5; x < w; x += 30) points.push(x, 0, x, h);
    for (let y = 0.5; y < h; y += 30) points.push(0, y, w, y);
    grid.points(points);
    return layer;
}

// ===== 创建一个可拖拽节点（流程图/拓扑图核心） =====
// 返回 Konva.Group（包含圆角矩形 + 文字），支持拖拽、悬停高亮
function createDraggableNode(stage, opts) {
    opts = opts || {};
    const tc = getThemeColors();
    const layer = opts.layer || stage.getLayers()[0] || new Konva.Layer();
    if (!opts.layer) stage.add(layer);

    const group = new Konva.Group({
        x: opts.x || 100,
        y: opts.y || 100,
        draggable: true,
        name: 'node',
    });

    const box = new Konva.Rect({
        width: opts.width || 160,
        height: opts.height || 60,
        fill: opts.fill || tc.bg,
        stroke: opts.stroke || tc.primary,
        strokeWidth: 1.5,
        cornerRadius: 10,
        shadowColor: 'rgba(0,0,0,0.4)',
        shadowBlur: 10,
        shadowOffset: { x: 0, y: 4 },
        shadowOpacity: 0.3,
    });

    const text = new Konva.Text({
        text: opts.label || '节点',
        fontSize: opts.fontSize || 14,
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        fill: tc.text,
        width: opts.width || 160,
        padding: 8,
        align: 'center',
        verticalAlign: 'middle',
    });

    group.add(box);
    group.add(text);
    layer.add(group);
    layer.draw();

    // 悬停高亮
    group.on('mouseenter', function () {
        box.strokeWidth(3);
        layer.draw();
    });
    group.on('mouseleave', function () {
        box.strokeWidth(1.5);
        layer.draw();
    });

    // 拖拽结束回调（如保存坐标到后端）
    if (opts.onDragEnd) {
        group.on('dragend', function (e) {
            opts.onDragEnd({ id: opts.id, x: group.x(), y: group.y() });
        });
    }
    return group;
}

// ===== 在两个节点之间画连线（流程图连线） =====
// 返回 Konva.Arrow；调用后需手动 layer.draw()
function connectNodes(layer, fromNode, toNode, opts) {
    opts = opts || {};
    const tc = getThemeColors();
    const line = new Konva.Arrow({
        points: [
            fromNode.x() + fromNode.width() / 2,
            fromNode.y() + fromNode.height() / 2,
            toNode.x() + toNode.width() / 2,
            toNode.y() + toNode.height() / 2,
        ],
        pointerLength: 10,
        pointerWidth: 8,
        fill: opts.color || tc.textSecondary,
        stroke: opts.color || tc.textSecondary,
        strokeWidth: 2,
        name: 'connector',
    });
    layer.add(line);
    return line;
}

// ===== 画布缩放（鼠标滚轮） =====
function bindKonvaZoom(stage, scaleBy) {
    scaleBy = scaleBy || 1.1;
    stage.on('wheel', function (e) {
        e.evt.preventDefault();
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
        stage.scale({ x: newScale, y: newScale });
        stage.position({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    });
}

// ===== 主题切换时刷新所有 Konva 画布 =====
function applyThemeToKonva() {
    allKonvaStages.forEach(function (stage) {
        stage.getLayers().forEach(function (layer) {
            layer.draw();
        });
    });
}

// ===== 销毁画布（切换视图/卸载时调用，防内存泄漏） =====
function destroyKonva(stage) {
    if (!stage) return;
    const idx = allKonvaStages.indexOf(stage);
    if (idx > -1) allKonvaStages.splice(idx, 1);
    stage.destroy();
}

// ===== 使用示例 =====
/*
// HTML：<div id="canvasBox" style="width:100%;height:500px;"></div>
// 1. 创建舞台
const stage = createKonvaStage('canvasBox');
// 2. 背景网格
addGridLayer(stage);
// 3. 两个节点 + 连线
const n1 = createDraggableNode(stage, { x: 80, y: 100, label: '数据源', id: 'src' });
const n2 = createDraggableNode(stage, { x: 400, y: 300, label: '计算节点', id: 'calc' });
connectNodes(stage.getLayers()[0], n1, n2);
// 4. 滚轮缩放
bindKonvaZoom(stage);
// 5. 主题切换时：applyThemeToKonva();（在 toggleTheme 中加一行）

// 主题切换联动（在 toggleTheme 中补充）：
//   applyThemeToCharts();   // Chart.js
//   applyThemeToEcharts();  // ECharts
//   applyThemeToKonva();    // Konva
*/
