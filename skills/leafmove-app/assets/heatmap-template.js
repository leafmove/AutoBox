/* ===== 热力图模板（ECharts heatmap + 通用网格） ===== */
/* 依赖：chart-echarts.js（setupEchartsTheme + createEchart） */

// ===== 中国市场红涨绿跌热力色函数（兼容现有 heatmapColor 用法） =====
// val > 0 红色（涨），val < 0 绿色（跌），-10 ~ +10 饱和
function heatmapColor(val) {
    const abs = Math.min(Math.abs(val), 10) / 10;
    if (val >= 0) return `rgba(239, 68, 68, ${0.15 + abs * 0.75})`; // 红
    return `rgba(16, 185, 129, ${0.15 + abs * 0.75})`; // 绿
}

// ===== 年度月份热力图（年份 × 12月） =====
// data: [{ year: 2026, month: 7, value: 3.2 }, ...]；空月 value 传 null
function buildYearHeatmapOption(data, title) {
    // 找出数据中的年份范围
    const years = [...new Set(data.map(function (d) { return d.year; }))].sort();
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

    const values = data.map(function (d) {
        return [d.month - 1, years.indexOf(d.year), d.value === null ? '-' : d.value];
    });

    return {
        title: { text: title, left: 'center' },
        tooltip: {
            formatter: function (p) {
                if (p.value[2] === '-') return '无数据';
                return `${years[p.value[1]]}年${months[p.value[0]]}：${p.value[2]}`;
            },
        },
        grid: { left: 60, right: 20, top: 50, bottom: 40 },
        xAxis: { type: 'category', data: months, splitArea: { show: true } },
        yAxis: { type: 'category', data: years, splitArea: { show: true } },
        visualMap: {
            min: -10, max: 10,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            inRange: {
                color: ['#10b981', '#f8fafc', '#ef4444'],  // 绿 → 白 → 红
            },
        },
        series: [{
            type: 'heatmap',
            data: values,
            label: { show: true, fontSize: 10 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
        }],
    };
}

// ===== 通用网格热力图（任意行列） =====
// rows: [{ label: '行名', values: [v1, v2, ...] }], cols: [列名数组]
function buildGridHeatmapOption(rows, cols, title) {
    const data = [];
    rows.forEach(function (row, ri) {
        row.values.forEach(function (v, ci) {
            data.push([ci, ri, v === null || v === undefined ? '-' : v]);
        });
    });
    return {
        title: { text: title, left: 'center' },
        tooltip: {
            formatter: function (p) {
                if (p.value[2] === '-') return '无数据';
                return `${rows[p.value[1]].label} / ${cols[p.value[0]]}：${p.value[2]}`;
            },
        },
        grid: { left: 80, right: 20, top: 50, bottom: 60 },
        xAxis: { type: 'category', data: cols, splitArea: { show: true }, axisLabel: { rotate: 30 } },
        yAxis: { type: 'category', data: rows.map(function (r) { return r.label; }), splitArea: { show: true } },
        visualMap: {
            min: -10, max: 10,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            inRange: { color: ['#10b981', '#f8fafc', '#ef4444'] },
        },
        series: [{ type: 'heatmap', data: data, label: { show: true, fontSize: 10 } }],
    };
}

// ===== 使用示例 =====
/*
setupEchartsTheme();
const chart = createEchart(document.getElementById('heatmapChart'),
    buildYearHeatmapOption(monthlyData, '月度收益率热力图'));
allEcharts.push(chart);
*/
