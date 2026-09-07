/* ===== ECharts K线图模板（金融场景） ===== */
/* 依赖：chart-echarts.js（setupEchartsTheme + createEchart + allEcharts 注册） */
/* 数据格式（来自后端 API，与 Tushare daily 对齐）：
   [{ date: '2026-07-01', open: 3.2, high: 3.35, low: 3.15, close: 3.28, volume: 1234567 }, ...] */

// ===== 构建 K线图 option =====
// data: 上述格式数组；name: 股票/基金名称；maPeriods: 均线周期数组（如 [5, 10, 20]）
function buildKlineOption(data, name, maPeriods) {
    const dates = data.map(function (d) { return d.date; });
    const kValues = data.map(function (d) { return [d.open, d.close, d.low, d.high]; });
    const volumes = data.map(function (d) { return d.volume; });

    // 计算均线（简单移动平均）
    const series = [{
        name: 'K线',
        type: 'candlestick',
        data: kValues,
        itemStyle: {
            color: '#ef4444',       // 阳线（红涨）
            color0: '#10b981',      // 阴线（绿跌）
            borderColor: '#ef4444',
            borderColor0: '#10b981',
        },
    }, {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        itemStyle: { color: '#8aa89b' },
    }];

    maPeriods.forEach(function (p) {
        const ma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < p - 1) { ma.push('-'); continue; }
            let sum = 0;
            for (let j = i - p + 1; j <= i; j++) sum += data[j].close;
            ma.push(+(sum / p).toFixed(4));
        }
        series.push({
            name: 'MA' + p,
            type: 'line',
            data: ma,
            smooth: true,
            showSymbol: false,
            lineStyle: { width: 1 },
        });
    });

    return {
        title: { text: name, left: 'center' },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
        },
        legend: {
            top: 30,
            data: ['K线'].concat(maPeriods.map(function (p) { return 'MA' + p; })),
        },
        grid: [
            { left: 60, right: 20, top: 60, height: '55%' },
            { left: 60, right: 20, top: '75%', height: '15%' },
        ],
        xAxis: [
            { type: 'category', data: dates, boundaryGap: true },
            { type: 'category', gridIndex: 1, data: dates, axisLabel: { show: false } },
        ],
        yAxis: [
            { scale: true, splitArea: { show: false } },
            { gridIndex: 1, splitNumber: 2, axisLabel: { show: false }, splitLine: { show: false } },
        ],
        dataZoom: [
            { type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100 },
            { type: 'slider', xAxisIndex: [0, 1], top: '92%', height: 20 },
        ],
        series: series,
    };
}

// ===== 使用示例 =====
/*
// 后端接口返回 K线数据
const data = await api('/api/kline?code=510500');

// 创建图表（chart-echarts.js 的 createEchart + 主题）
setupEchartsTheme();
const chart = createEchart(document.getElementById('klineChart'),
    buildKlineOption(data, '中证500ETF', [5, 10, 20]));
allEcharts.push(chart);   // 注册以便主题联动刷新
*/
