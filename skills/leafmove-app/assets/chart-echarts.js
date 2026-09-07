/* ===== ECharts 主题联动代码模板 ===== */
/* 将此文件内容粘贴到 <script> 标签中，在 ECharts CDN 引入之后 */
/* BoxApp 子应用：API 使用相对路径，API_BASE 为空字符串（同源） */

// ===== 主题颜色（复用 Chart.js 主题的 CSS 变量） =====
function getThemeColors() {
    const s = getComputedStyle(document.documentElement);
    return {
        grid: s.getPropertyValue('--chart-grid').trim(),
        text: s.getPropertyValue('--chart-text').trim(),
        tooltipBg: s.getPropertyValue('--chart-tooltip-bg').trim(),
        tooltipTitle: s.getPropertyValue('--chart-tooltip-title').trim(),
        tooltipBody: s.getPropertyValue('--chart-tooltip-body').trim(),
        primary: s.getPropertyValue('--primary').trim(),
        up: s.getPropertyValue('--color-up').trim(),
        down: s.getPropertyValue('--color-down').trim(),
        neutral: s.getPropertyValue('--color-neutral').trim(),
    };
}

// ===== 注册 ECharts 明暗主题 =====
// 调用时机：页面加载后、创建任何图表之前
function setupEchartsTheme() {
    if (typeof echarts === 'undefined') return;
    const tc = getThemeColors();
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // 统一配色（中国市场：红涨绿跌；主色 Mint Quantum 薄荷绿开头，青色次之避免与主色/跌色混淆）
    const palette = isLight
        ? ['#047857', '#0891b2', '#d97706', '#dc2626', '#2563eb', '#8b5cf6']
        : ['#34d399', '#22d3ee', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];

    const theme = {
        color: palette,
        backgroundColor: 'transparent',
        textStyle: { color: tc.text },
        title: {
            textStyle: { color: tc.text, fontSize: 15, fontWeight: 600 },
            subtextStyle: { color: tc.text },
        },
        legend: {
            textStyle: { color: tc.text },
            pageTextStyle: { color: tc.text },
        },
        tooltip: {
            backgroundColor: tc.tooltipBg,
            borderColor: tc.grid,
            borderWidth: 1,
            textStyle: { color: tc.tooltipBody },
            axisPointer: { lineStyle: { color: tc.grid } },
        },
        grid: { borderColor: tc.grid },
        categoryAxis: {
            axisLine: { lineStyle: { color: tc.grid } },
            axisTick: { lineStyle: { color: tc.grid } },
            axisLabel: { color: tc.text },
            splitLine: { show: false },
        },
        valueAxis: {
            axisLine: { show: false },
            axisLabel: { color: tc.text },
            splitLine: { lineStyle: { color: tc.grid } },
        },
    };
    echarts.registerTheme('yd-theme', theme);
}

// ===== 创建图表的统一入口（推荐使用） =====
// 返回 ECharts 实例；需要主题联动时，先 setupEchartsTheme() 再调用
function createEchart(el, option) {
    if (typeof echarts === 'undefined') return null;
    const chart = echarts.init(el, 'yd-theme');
    chart.setOption(option);
    return chart;
}

// ===== 主题切换时刷新所有 ECharts 实例 =====
// 需要将所有 ECharts 实例注册到 allEcharts 数组
let allEcharts = [];

function applyThemeToEcharts() {
    setupEchartsTheme();  // 重新注册主题（颜色随 CSS 变量变化）
    allEcharts.forEach(function (chart) {
        if (chart) chart.setOption(chart.getOption(), true);  // notMerge=true 强制刷新
    });
}

// ===== 窗口尺寸自适应 =====
// 建议在 DOMContentLoaded 后调用：bindEchartResize()
function bindEchartResize() {
    window.addEventListener('resize', function () {
        allEcharts.forEach(function (chart) { if (chart) chart.resize(); });
    });
}

// ===== 销毁图表（卸载/切换视图时调用，防内存泄漏） =====
function destroyEchart(chart) {
    if (!chart) return;
    const idx = allEcharts.indexOf(chart);
    if (idx > -1) allEcharts.splice(idx, 1);
    chart.dispose();
}

// ===== 主题切换联动示例（与 Chart.js 共用 toggleTheme） =====
/*
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    var newTheme = current === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('theme', newTheme);
    setupChartDefaults();      // Chart.js 全局默认值
    applyThemeToCharts();      // 刷新 Chart.js
    applyThemeToEcharts();     // 刷新 ECharts（内部会重新注册主题）
}

document.addEventListener('DOMContentLoaded', function () {
    setupEchartsTheme();
    bindEchartResize();
});
*/
