/* ===== Chart.js 主题联动代码模板 ===== */
/* 将此文件内容粘贴到 <script> 标签中，在Chart.js CDN引入之后 */
/* BoxApp 子应用：API 使用相对路径，API_BASE 为空字符串（同源） */

// ===== BoxApp API 请求基础 =====
const API_BASE = '';  // 空字符串 = 同源，自动走宿主端口

async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
}

// 主题颜色辅助函数
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

// Chart.js 图表坐标轴和网格的通用配置
function chartScaleOpts() {
    const tc = getThemeColors();
    return {
        x: { ticks: { color: tc.text }, grid: { color: tc.grid } },
        y: { ticks: { color: tc.text }, grid: { color: tc.grid } }
    };
}

// Chart.js tooltip 通用配置
function chartTooltipOpts() {
    const tc = getThemeColors();
    return {
        backgroundColor: tc.tooltipBg,
        titleColor: tc.tooltipTitle,
        bodyColor: tc.tooltipBody,
        borderColor: tc.grid,
        borderWidth: 1,
    };
}

// 设置 Chart.js 全局默认值（在 DOMContentLoaded 时调用一次）
function setupChartDefaults() {
    const tc = getThemeColors();
    if (Chart.defaults.plugins.tooltip) {
        Chart.defaults.plugins.tooltip.backgroundColor = tc.tooltipBg;
        Chart.defaults.plugins.tooltip.titleColor = tc.tooltipTitle;
        Chart.defaults.plugins.tooltip.bodyColor = tc.tooltipBody;
        Chart.defaults.plugins.tooltip.borderColor = tc.grid;
        Chart.defaults.plugins.tooltip.borderWidth = 1;
    }
    if (Chart.defaults.plugins.legend && Chart.defaults.plugins.legend.labels) {
        Chart.defaults.plugins.legend.labels.color = tc.text;
    }
    Chart.defaults.color = tc.text;
}

// 主题切换时刷新所有已渲染的图表
// 需要将所有 Chart 实例注册到 allCharts 数组
let allCharts = [];

function applyThemeToCharts() {
    const tc = getThemeColors();
    allCharts.forEach(function(chart) {
        if (!chart) return;
        if (chart.options.scales) {
            Object.values(chart.options.scales).forEach(function(scale) {
                if (scale.ticks) scale.ticks.color = tc.text;
                if (scale.grid) scale.grid.color = tc.grid;
            });
        }
        if (chart.options.plugins && chart.options.plugins.tooltip) {
            chart.options.plugins.tooltip.backgroundColor = tc.tooltipBg;
            chart.options.plugins.tooltip.titleColor = tc.tooltipTitle;
            chart.options.plugins.tooltip.bodyColor = tc.tooltipBody;
        }
        if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
            chart.options.plugins.legend.labels.color = tc.text;
        }
        chart.update('none');
    });
}

// 主题切换函数
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    var newTheme = current === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('theme', newTheme);
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = newTheme === 'light' ? '🌙' : '☀️';
    setupChartDefaults();
    setTimeout(function() { applyThemeToCharts(); }, 50);
}

// 初始化主题（默认亮色）
(function initTheme() {
    var saved = localStorage.getItem('theme');
    if (saved !== 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();

// DOMContentLoaded 时设置 Chart 全局默认值
document.addEventListener('DOMContentLoaded', function() {
    setupChartDefaults();
    var saved = localStorage.getItem('theme');
    var btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
});
