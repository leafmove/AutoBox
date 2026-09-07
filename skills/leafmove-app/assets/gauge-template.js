/* ===== 仪表盘模板（ECharts gauge） ===== */
/* 依赖：chart-echarts.js（setupEchartsTheme + createEchart） */
/* 适用：单指标状态展示（饱和度、进度、健康度、情绪指标） */

// ===== 构建仪表盘 option =====
// value: 当前值；max: 最大值；title: 指标名；unit: 单位
// thresholds: [{ value: 60, color: '#10b981' }, { value: 80, color: '#f59e0b' }, { value: 100, color: '#ef4444' }]
//   —— 分段颜色：0-60 绿、60-80 黄、80-100 红（按需调整）
function buildGaugeOption(value, max, title, unit, thresholds) {
    thresholds = thresholds || [
        { value: 60, color: '#10b981' },
        { value: 80, color: '#f59e0b' },
        { value: max, color: '#ef4444' },
    ];
    return {
        series: [{
            type: 'gauge',
            min: 0,
            max: max,
            progress: { show: true, width: 14 },
            axisLine: {
                lineStyle: {
                    width: 14,
                    color: thresholds.map(function (t) { return [t.value / max, t.color]; }),
                },
            },
            pointer: { itemStyle: { color: 'auto' } },
            axisTick: { distance: -14, length: 6, lineStyle: { color: '#fff', width: 1 } },
            splitLine: { distance: -14, length: 14, lineStyle: { color: '#fff', width: 2 } },
            axisLabel: { distance: -24, color: '#8aa89b', fontSize: 10 },
            anchor: { show: true, size: 18, itemStyle: { color: '#fff', borderWidth: 2, borderColor: '#8aa89b' } },
            title: { offsetCenter: [0, '30%'], fontSize: 14, color: '#8aa89b' },
            detail: {
                valueAnimation: true,
                formatter: '{value}' + (unit || ''),
                color: 'auto',
                fontSize: 24,
                offsetCenter: [0, '65%'],
            },
            data: [{ value: value, name: title }],
        }],
    };
}

// ===== 使用示例 =====
/*
setupEchartsTheme();
const chart = createEchart(document.getElementById('gaugeChart'),
    buildGaugeOption(72, 100, '饱和度', '%'));
allEcharts.push(chart);

// 动态更新
function updateGauge(chart, newValue) {
    chart.setOption({ series: [{ data: [{ value: newValue }] }] });
}
*/
