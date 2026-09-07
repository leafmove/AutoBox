/* ===== PixiJS 模板（L3+ 高性能 2D：粒子 / 可视化 / 轻游戏） ===== */
/* CDN 引入（放在 <script> 标签中，PixiJS 之后）：
   <script src="https://cdn.jsdelivr.net/npm/pixi.js@7/dist/pixi.min.js"></script>
   BoxApp 子应用：API 使用相对路径，API_BASE 为空字符串（同源）
   适用场景：粒子特效、实时数据大屏动画、高性能 2D 渲染（数千对象不卡顿） */

// ===== 主题色 =====
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        bg: s.getPropertyValue('--bg-card').trim() || '#0e1f18',
        primary: s.getPropertyValue('--primary').trim() || '#34d399',
        up: s.getPropertyValue('--color-up').trim() || '#ef4444',
        down: s.getPropertyValue('--color-down').trim() || '#10b981',
        text: s.getPropertyValue('--text-primary').trim() || '#f1f5f9',
    };
}

// ===== 创建一个 PixiJS 应用（统一入口） =====
// containerId: 容器 div 的 id；返回 PIXI.Application（已注册到 allPixiApps）
let allPixiApps = [];

function createPixiApp(containerId, opts) {
    opts = opts || {};
    const container = document.getElementById(containerId);
    if (!container || typeof PIXI === 'undefined') return null;
    const tc = getThemeColors();
    const app = new PIXI.Application({
        width: opts.width || container.clientWidth || 800,
        height: opts.height || container.clientHeight || 500,
        backgroundColor: opts.background === 'transparent' ? 0x000000 : parseInt((tc.bg || '#0e1f18').replace('#', ''), 16),
        backgroundAlpha: opts.background === 'transparent' ? 0 : 1,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });
    container.appendChild(app.view);
    allPixiApps.push(app);
    return app;
}

// ===== 粒子系统（简单粒子发射器） =====
// app: PIXI.Application；返回粒子容器 container（含 updateParticles(dt) 方法）
function createParticleSystem(app, opts) {
    opts = opts || {};
    const tc = getThemeColors();
    const container = new PIXI.Container();
    app.stage.addChild(container);

    const count = opts.count || 200;
    const particles = [];
    const colors = [tc.primary, tc.up, tc.down];

    for (let i = 0; i < count; i++) {
        const g = new PIXI.Graphics();
        const color = colors[Math.floor(Math.random() * colors.length)];
        g.beginFill(parseInt(color.replace('#', ''), 16), 0.7);
        g.drawCircle(0, 0, opts.radius || 2 + Math.random() * 3);
        g.endFill();
        g.x = Math.random() * app.screen.width;
        g.y = Math.random() * app.screen.height;
        g.vx = (Math.random() - 0.5) * (opts.speed || 1);
        g.vy = (Math.random() - 0.5) * (opts.speed || 1);
        container.addChild(g);
        particles.push(g);
    }

    // 更新函数：每帧调用（在 ticker 中）
    function updateParticles() {
        particles.forEach(function (p) {
            p.x += p.vx;
            p.y += p.vy;
            // 边界回弹
            if (p.x < 0 || p.x > app.screen.width) p.vx *= -1;
            if (p.y < 0 || p.y > app.screen.height) p.vy *= -1;
        });
    }

    return { container: container, update: updateParticles, particles: particles };
}

// ===== 数据点阵（散点/实时数据可视化基础） =====
// points: [{x: 0~1, y: 0~1, value: 0~1}]；在 stage 上绘制散点，返回容器
function createScatterLayer(app, points, opts) {
    opts = opts || {};
    const tc = getThemeColors();
    const container = new PIXI.Container();
    app.stage.addChild(container);

    const W = app.screen.width, H = app.screen.height;
    points.forEach(function (pt) {
        const g = new PIXI.Graphics();
        const color = pt.value > 0.5 ? tc.up : tc.down;
        g.beginFill(parseInt(color.replace('#', ''), 16), 0.8);
        g.drawCircle(0, 0, opts.radius || 3);
        g.endFill();
        g.x = pt.x * W;
        g.y = pt.y * H;
        container.addChild(g);
    });
    return container;
}

// ===== 启动渲染循环 =====
// 使用 app.ticker（PixiJS 自带 rAF，符合 iframe 性能规范）
function startPixiLoop(app, updateFn) {
    app.ticker.add(function (delta) {
        if (updateFn) updateFn(delta);
    });
}

// ===== 销毁（切换视图/卸载时调用，释放 GPU 资源） =====
function destroyPixi(app) {
    if (!app) return;
    const idx = allPixiApps.indexOf(app);
    if (idx > -1) allPixiApps.splice(idx, 1);
    app.destroy(true, { children: true, texture: true, baseTexture: true });
}

// ===== 使用示例 =====
/*
// HTML：<div id="particleBox" style="width:100%;height:400px;"></div>
// 1. 创建应用（透明背景，叠加在卡片上）
const app = createPixiApp('particleBox', { background: 'transparent' });
// 2. 粒子系统
const ps = createParticleSystem(app, { count: 150, speed: 1.2 });
// 3. 渲染循环（ticker 自动 rAF）
startPixiLoop(app, function () {
    ps.update();
});
// 4. 窗口变化时（resize 事件中）：
//    app.renderer.resize(container.clientWidth, container.clientHeight);

// 卸载时：
//   destroyPixi(app);
*/
