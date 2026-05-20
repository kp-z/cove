import { useRef, useEffect } from 'react';
import EChartsReact from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { shadcnDarkTheme } from '@/shared/lib/echarts-theme';
import { cn } from '@/shared/lib/utils';

interface EChartWrapperProps {
  option: EChartsOption;
  height?: number;
  className?: string;
  loading?: boolean;
}

export function EChartWrapper({
  option,
  height = 250,
  className,
  loading = false,
}: EChartWrapperProps) {
  const chartRef = useRef<EChartsReact>(null);

  const mergedOption: EChartsOption = {
    ...shadcnDarkTheme,
    ...option,
  };

  useEffect(() => {
    const handleResize = () => {
      chartRef.current?.getEchartsInstance().resize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={cn('w-full', className)} style={{ height: `${height}px` }}>
      <EChartsReact
        ref={chartRef}
        option={mergedOption}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        showLoading={loading}
        loadingOption={{
          text: 'Loading...',
          color: '#3b82f6',
          textColor: 'rgba(255, 255, 255, 0.7)',
          maskColor: 'rgba(15, 17, 26, 0.5)',
        }}
      />
    </div>
  );
}
