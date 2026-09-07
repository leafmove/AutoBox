/* ===== 雷达图模板（ECharts radar） ===== */
/* 依赖：chart-echarts.js（setupEchartsTheme + createEchart） */
/* 适用：多维度评分对比（如淘宝5维因子、能力评估、产品对比） */

// ===== 构建雷达图 option =====
// indicators: [{ name: '成长性', max: 100 }, ...]
// seriesData: [{ name: '对象A', value: [85, 70, 90, 60, 75] }, ...]
function buildRadarOption(indicators, seriesData, title) {
    return {
        title: { text: title, left: 'center' },
        tooltip: {},
        legend: {
            top: 30,
            data: seriesData.map(function (s) { return s.name; }),
        },
        radar: {
            indicator: indicators,
            radius: '65%',
            center: ['50%', '58%'],
            splitNumber: 4,
            axisName: { color: '#8aa89b', fontSize: 12 },
            splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.3)' } },
            splitArea: { areaStyle: { color: ['transparent', 'rgba(148, 163, 184, 0.05)'] } },
            axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.3)' } },
        },
        series: [{
            type: 'radar',
            data: seriesData.map(function (s) {
                return {
                    name: s.name,
                    value: s.value,
                    areaStyle: { opacity: 0.15 },
                };
            }),
        }],
    };
}

// ===== 使用示例 =====
/*
setupEchartsTheme();
const chart = createEchart(document.getElementById('radarChart'), buildRadarOption(
    [
        { name: '流量', max: 100 },
        { name: '转化', max: 100 },
        { name: '利润', max: 100 },
        { name: '壁垒', max: 100 },
        { name: '可复制性', max: 100 },
    ],
    [
        { name: '方案A', value: [85, 70, 90, 60, 75] },
        { name: '方案B', value: [70, 85, 65, 80, 60] },
    ],
    '方案对比'
));
allEcharts.push(chart);
*/
