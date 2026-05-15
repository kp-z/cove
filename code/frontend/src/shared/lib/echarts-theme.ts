import type { EChartsOption } from 'echarts';

export const shadcnDarkTheme: Partial<EChartsOption> = {
  backgroundColor: 'transparent',
  textStyle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Geist Variable, Inter, sans-serif',
    fontSize: 12,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true,
  },
  tooltip: {
    backgroundColor: 'rgba(15, 17, 26, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 8,
    textStyle: {
      color: '#fff',
      fontSize: 12,
    },
    padding: [8, 12],
  },
  axisLine: {
    lineStyle: {
      color: 'rgba(255, 255, 255, 0.1)',
    },
  },
  splitLine: {
    lineStyle: {
      color: 'rgba(255, 255, 255, 0.1)',
      type: 'dashed',
    },
  },
  axisLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
};

export const chartColors = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  idle: '#9ca3af',
  series: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
};
