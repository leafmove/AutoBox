/* ===== Three.js 模板（L4 WebGL 3D：3D 可视化） ===== */
/* CDN 引入（放在 <script> 标签中，Three.js 之后）：
   <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
   <script src="https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js"></script>
   BoxApp 子应用：API 使用相对路径，API_BASE 为空字符串（同源）
   适用场景：3D 柱状图、3D 散点、模型展示、空间数据可视化 */

// ===== 主题色 =====
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        bg: s.getPropertyValue('--bg-card').trim() || '#0e1f18',
        primary: s.getPropertyValue('--primary').trim() || '#34d399',
        up: s.getPropertyValue('--color-up').trim() || '#ef4444',
        down: s.getPropertyValue('--color-down').trim() || '#10b981',
        text: s.getPropertyValue('--text-primary').trim() || '#f1f5f9',
        grid: s.getPropertyValue('--chart-grid').trim() || 'rgba(51,65,85,0.3)',
    };
}

// ===== 创建 3D 场景（统一入口） =====
// containerId: 容器 div 的 id；返回 { scene, camera, renderer, controls }
let allThreeScenes = [];

function createThreeScene(containerId, opts) {
    opts = opts || {};
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === 'undefined') return null;
    const tc = getThemeColors();

    const scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(opts.cameraX || 60, opts.cameraY || 60, opts.cameraZ || 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: opts.transparent !== false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    container.appendChild(renderer.domElement);

    // 轨道控制（鼠标旋转/缩放/平移）
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;

    // 灯光（环境光 + 方向光）
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    const state = { scene: scene, camera: camera, renderer: renderer, controls: controls };
    allThreeScenes.push(state);

    // 窗口自适应
    state.resize = function () {
        const w = container.clientWidth || width;
        const h = container.clientHeight || height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', state.resize);
    return state;
}

// ===== 3D 柱状图（金融/数据可视化最常用） =====
// data: [{ label: '1月', value: 3.2 }, ...]；value 可为负（绿色）
// 返回 { group, meshes }；meshes 供点击/悬停交互
function buildBarChart3D(state, data, opts) {
    opts = opts || {};
    const tc = getThemeColors();
    const group = new THREE.Group();
    state.scene.add(group);

    const barW = opts.barWidth || 3;
    const gap = opts.gap || 2;
    const totalW = data.length * (barW + gap);
    const startX = -totalW / 2;

    const meshes = [];
    data.forEach(function (d, i) {
        const isUp = d.value >= 0;
        const color = isUp ? tc.up : tc.down;
        const h = Math.abs(d.value) * (opts.scale || 1);
        const geo = new THREE.BoxGeometry(barW, h, barW);
        const mat = new THREE.MeshPhongMaterial({
            color: parseInt(color.replace('#', ''), 16),
            transparent: true,
            opacity: 0.9,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(startX + i * (barW + gap) + barW / 2, h / 2, 0);
        group.add(mesh);
        mesh.userData = { label: d.label, value: d.value };
        meshes.push(mesh);
    });

    // 底部网格地面
    const gridHelper = new THREE.GridHelper(totalW + 10, data.length || 10, 0x64748b, 0x64748b);
    gridHelper.position.y = 0;
    group.add(gridHelper);

    return { group: group, meshes: meshes };
}

// ===== 渲染循环（rAF，符合 iframe 性能规范） =====
function startThreeLoop(state, updateFn) {
    function animate() {
        state.animId = requestAnimationFrame(animate);
        if (state.controls) state.controls.update();
        if (updateFn) updateFn(state);
        state.renderer.render(state.scene, state.camera);
    }
    animate();
    return state;
}

// ===== 点击拾取（raycaster：柱状图点击交互） =====
function bindThreeClick(state, meshes, onPick) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    state.renderer.domElement.addEventListener('click', function (e) {
        const rect = state.renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, state.camera);
        const hits = raycaster.intersectObjects(meshes);
        if (hits.length > 0 && onPick) onPick(hits[0].object.userData);
    });
}

// ===== 销毁（切换视图/卸载时调用，释放 GPU 上下文！） =====
function destroyThree(state) {
    if (!state) return;
    cancelAnimationFrame(state.animId);
    window.removeEventListener('resize', state.resize);
    // 遍历释放所有 geometry/material/texture
    state.scene.traverse(function (obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(function (m) { m.dispose(); });
            else obj.material.dispose();
        }
    });
    state.renderer.dispose();
    const idx = allThreeScenes.indexOf(state);
    if (idx > -1) allThreeScenes.splice(idx, 1);
}

// ===== 使用示例 =====
/*
// HTML：<div id="threeBox" style="width:100%;height:500px;"></div>
// 1. 创建场景
const s3d = createThreeScene('threeBox');
// 2. 3D 柱状图（数据来自后端）
const data = await api('/api/performance');  // [{label, value}]
const bars = buildBarChart3D(s3d, data, { scale: 2 });
// 3. 启动渲染
startThreeLoop(s3d);
// 4. 点击交互
bindThreeClick(s3d, bars.meshes, function (d) {
    showToast(d.label + '：' + d.value, 'info');
});
// 5. 卸载时（必须，否则占用 WebGL 上下文）：
//    destroyThree(s3d);
*/
