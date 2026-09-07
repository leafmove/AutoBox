/* ===== Fabric.js 模板（L3 设计工具：图形编辑器 / 设计器 / SVG编辑） ===== */
/* CDN 引入（放在 <script> 标签中，Fabric.js 之后）：
   <script src="https://cdn.jsdelivr.net/npm/fabric@5.3.1/dist/fabric.min.js"></script>
   BoxApp 子应用：API 使用相对路径，API_BASE 为空字符串（同源）
   适用场景：拖拽式设计器、图形编辑器、SVG/JSON 设计稿导入导出、海报/卡片排版工具
   与 Konva 的区别：Fabric 提供完整对象模型（选中/缩放/旋转/层级/序列化开箱即用），
   适合"设计稿编辑"类应用；Konva 更轻量，适合"自定义画布交互"类应用。 */

// ===== 主题色（复用 CSS 变量） =====
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        bg: s.getPropertyValue('--bg-card').trim() || '#0e1f18',
        border: s.getPropertyValue('--border').trim() || '#1c332a',
        primary: s.getPropertyValue('--primary').trim() || '#34d399',
        text: s.getPropertyValue('--text-primary').trim() || '#f1f5f9',
        textSecondary: s.getPropertyValue('--text-secondary').trim() || '#8aa89b',
    };
}

// ===== 创建 Fabric 画布（统一入口） =====
// containerId: 容器 div 的 id；返回 fabric.Canvas（已注册到 allFabricCanvases）
let allFabricCanvases = [];

function createFabricCanvas(containerId, opts) {
    opts = opts || {};
    const container = document.getElementById(containerId);
    if (!container || typeof fabric === 'undefined') return null;
    const tc = getThemeColors();

    const canvas = new fabric.Canvas(containerId, {
        width: opts.width || container.clientWidth || 800,
        height: opts.height || container.clientHeight || 500,
        backgroundColor: opts.background === 'transparent' ? 'transparent' : tc.bg,
        selection: true,          // 框选
        preserveObjectStacking: true,
    });
    allFabricCanvases.push(canvas);

    // 网格背景（可选，辅助对齐）
    if (opts.grid !== false) {
        drawFabricGrid(canvas);
    }
    return canvas;
}

// ===== 背景网格 =====
function drawFabricGrid(canvas) {
    const tc = getThemeColors();
    const grid = [];
    const size = 20;
    for (let x = 0.5; x < canvas.width; x += size) {
        grid.push(new fabric.Line([x, 0, x, canvas.height], {
            stroke: tc.border, strokeWidth: 0.5, selectable: false, evented: false, excludeFromExport: true,
        }));
    }
    for (let y = 0.5; y < canvas.height; y += size) {
        grid.push(new fabric.Line([0, y, canvas.width, y], {
            stroke: tc.border, strokeWidth: 0.5, selectable: false, evented: false, excludeFromExport: true,
        }));
    }
    grid.forEach(function (l) { canvas.add(l); });
    canvas.sendToBack(grid[0]);
    return grid;
}

// ===== 图形添加助手（图形编辑器核心） =====
// 统一返回创建的 fabric 对象；style 可选覆盖（{fill, stroke, strokeWidth}）

function fabricAddRect(canvas, opts) {
    const tc = getThemeColors();
    const rect = new fabric.Rect({
        left: opts.left || 60,
        top: opts.top || 60,
        width: opts.width || 120,
        height: opts.height || 80,
        fill: opts.fill || tc.primary,
        stroke: opts.stroke || '',
        strokeWidth: opts.strokeWidth || 0,
        rx: opts.rx || 0,   // 圆角
        ry: opts.ry || 0,
        cornerColor: tc.primary,
        cornerStrokeColor: tc.primary,
    });
    canvas.add(rect);
    return rect;
}

function fabricAddCircle(canvas, opts) {
    const tc = getThemeColors();
    const circle = new fabric.Circle({
        left: opts.left || 120,
        top: opts.top || 100,
        radius: opts.radius || 40,
        fill: opts.fill || tc.textSecondary,
        stroke: opts.stroke || '',
        strokeWidth: opts.strokeWidth || 0,
        cornerColor: tc.primary,
        cornerStrokeColor: tc.primary,
    });
    canvas.add(circle);
    return circle;
}

function fabricAddText(canvas, opts) {
    const tc = getThemeColors();
    const text = new fabric.Textbox(opts.text || '双击编辑文字', {
        left: opts.left || 80,
        top: opts.top || 80,
        fontSize: opts.fontSize || 20,
        fill: opts.fill || tc.text,
        width: opts.width || 200,
        cornerColor: tc.primary,
        cornerStrokeColor: tc.primary,
    });
    canvas.add(text);
    return text;
}

// 图片（Base64 / URL / 文件上传）
function fabricAddImage(canvas, url, opts, onLoad) {
    fabric.Image.fromURL(url, function (img) {
        const maxW = opts && opts.maxWidth || 300;
        if (img.width > maxW) {
            const scale = maxW / img.width;
            img.scale(scale);
        }
        img.set({
            left: (opts && opts.left) || 60,
            top: (opts && opts.top) || 60,
            cornerColor: '#34d399',
            cornerStrokeColor: '#34d399',
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        if (onLoad) onLoad(img);
    }, { crossOrigin: 'anonymous' });
}

// ===== 选中事件绑定（联动属性面板） =====
// 用法：bindFabricSelection(canvas, function(obj) { 更新右侧面板 });
function bindFabricSelection(canvas, onSelect) {
    canvas.on('selection:created', function (e) {
        if (onSelect) onSelect(e.selected[0], canvas);
    });
    canvas.on('selection:updated', function (e) {
        if (onSelect) onSelect(e.selected[0], canvas);
    });
    canvas.on('selection:cleared', function () {
        if (onSelect) onSelect(null, canvas);
    });
}

// ===== 修改选中对象属性（属性面板用） =====
// 例：fabricUpdateSelected(canvas, { fill: '#ef4444' });
function fabricUpdateSelected(canvas, props) {
    const active = canvas.getActiveObject();
    if (!active) return;
    active.set(props);
    canvas.requestRenderAll();
}

// ===== 图层操作（上移/下移/删除/复制） =====
function fabricBringForward(canvas)  { const o = canvas.getActiveObject(); if (o) { canvas.bringForward(o); canvas.requestRenderAll(); } }
function fabricSendBackward(canvas)  { const o = canvas.getActiveObject(); if (o) { canvas.sendBackwards(o); canvas.requestRenderAll(); } }
function fabricDeleteSelected(canvas) { const o = canvas.getActiveObject(); if (o) { canvas.remove(o); canvas.requestRenderAll(); } }

function fabricDuplicateSelected(canvas) {
    const o = canvas.getActiveObject();
    if (!o) return;
    o.clone(function (clone) {
        clone.set({ left: o.left + 20, top: o.top + 20 });
        canvas.add(clone);
        canvas.setActiveObject(clone);
        canvas.requestRenderAll();
    });
}

// ===== 清空画布 =====
function fabricClearAll(canvas) {
    canvas.clear();
    drawFabricGrid(canvas);   // 保留网格
}

// ===== 撤销/重做（基于 JSON 快照，轻量实现） =====
// 初始化：const history = createFabricHistory(canvas, 30);  // 最多 30 步
// 之后每次操作后调用 history.push()；undo/redo 由函数提供
function createFabricHistory(canvas, maxSteps) {
    maxSteps = maxSteps || 30;
    const stack = [];
    let index = -1;

    function snapshot() {
        return JSON.stringify(canvas.toJSON(['excludeFromExport']));
    }

    function push() {
        // 截断 redo 分支
        stack.length = index + 1;
        stack.push(snapshot());
        if (stack.length > maxSteps) stack.shift();
        index = stack.length - 1;
    }

    function apply(state) {
        canvas.loadFromJSON(state, function () {
            canvas.requestRenderAll();
        });
    }

    function undo() {
        if (index <= 0) return;
        index--;
        apply(stack[index]);
    }

    function redo() {
        if (index >= stack.length - 1) return;
        index++;
        apply(stack[index]);
    }

    push();  // 初始状态
    return { push: push, undo: undo, redo: redo, canUndo: function () { return index > 0; }, canRedo: function () { return index < stack.length - 1; } };
}

// ===== 导出/保存（对接后端，持久化设计稿） =====
// 导出 JSON（保存到后端）：await api('/api/design', {method:'POST', body: canvas.toJSON()});
function fabricToJSON(canvas) {
    return JSON.stringify(canvas.toJSON(['excludeFromExport']));
}

// 加载 JSON（从后端读取）：await api('/api/design') → fabricLoadJSON(canvas, data)
function fabricLoadJSON(canvas, jsonStr) {
    canvas.loadFromJSON(jsonStr, function () {
        canvas.requestRenderAll();
    });
}

// 导出 PNG（下载 / 传给后端生成海报）
function fabricToDataURL(canvas) {
    return canvas.toDataURL({ format: 'png', multiplier: 2 });  // 2x 高清
}

// ===== 主题切换刷新（背景/网格色随主题变） =====
function applyThemeToFabric() {
    const tc = getThemeColors();
    allFabricCanvases.forEach(function (canvas) {
        canvas.backgroundColor = tc.bg;
        canvas.requestRenderAll();
    });
}

// ===== 销毁画布（切换视图/卸载时调用，防内存泄漏） =====
function destroyFabric(canvas) {
    if (!canvas) return;
    const idx = allFabricCanvases.indexOf(canvas);
    if (idx > -1) allFabricCanvases.splice(idx, 1);
    canvas.dispose();
}

// ===== 使用示例 =====
/*
// HTML：
//   <div id="designBox" style="width:100%;height:500px;"></div>
//   <div class="flex gap-10 mt-10">
//     <button class="btn btn-primary" onclick="addRect()">矩形</button>
//     <button class="btn" onclick="addCircle()">圆形</button>
//     <button class="btn" onclick="addText()">文字</button>
//     <button class="btn" onclick="saveDesign()">保存</button>
//     <button class="btn" onclick="loadDesign()">加载</button>
//     <button class="btn" onclick="history.undo()">撤销</button>
//   </div>

// 1. 创建画布
const designCanvas = createFabricCanvas('designBox');
const history = createFabricHistory(designCanvas, 30);

// 2. 工具栏按钮
function addRect()  { fabricAddRect(designCanvas, { width: 140, height: 90 }); history.push(); }
function addCircle(){ fabricAddCircle(designCanvas, { radius: 45 }); history.push(); }
function addText()  { fabricAddText(designCanvas, { text: '双击编辑文字' }); history.push(); }

// 3. 选中联动属性面板
bindFabricSelection(designCanvas, function (obj) {
    document.getElementById('propPanel').innerHTML = obj
        ? '已选中：' + (obj.type || '') + ' | 位置(' + Math.round(obj.left) + ',' + Math.round(obj.top) + ')'
        : '未选中任何对象';
});

// 4. 保存到后端
async function saveDesign() {
    await api('/api/design', { method: 'POST', body: fabricToJSON(designCanvas) });
    showToast('设计稿已保存', 'success');
}
async function loadDesign() {
    const res = await api('/api/design');
    fabricLoadJSON(designCanvas, res.data);
    history.push();
}

// 5. 主题切换时：applyThemeToFabric();
// 6. 卸载时：destroyFabric(designCanvas);
*/
