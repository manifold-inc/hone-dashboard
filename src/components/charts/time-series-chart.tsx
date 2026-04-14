"use client";

import { useMemo } from "react";
import { Liveline } from "liveline";
import type { LivelinePoint, LivelineSeries } from "liveline";

interface Series {
  key: string;
  label: string;
  color?: string;
}

interface TimeSeriesChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  series: Series[];
  xKey?: string;
  height?: number;
}

const MONO_PALETTE = [
  "#32ffc8",
  "#1a9977",
  "#0dcc9e",
  "#5dffd6",
];

const EMPHASIS_COLORS: Record<string, string> = {
  positive: "#32ffc8",
  negative: "#f87171",
  warning: "#fbbf24",
};

function resolveColor(color: string | undefined, index: number): string {
  if (color && EMPHASIS_COLORS[color]) return EMPHASIS_COLORS[color];
  if (color) return color;
  return MONO_PALETTE[index % MONO_PALETTE.length];
}

function toPoints(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  key: string,
  timeKey: string
): LivelinePoint[] {
  const points: LivelinePoint[] = [];
  for (let i = 0; i < data.length; i++) {
    const val = data[i][key];
    if (val === null || val === undefined) continue;
    const time = data[i].createdAt
      ? Math.floor(new Date(data[i].createdAt).getTime() / 1000)
      : data[i][timeKey] ?? i;
    points.push({ time, value: Number(val) });
  }
  return points;
}

export function TimeSeriesChart({
  data,
  series,
  xKey = "window",
  height = 300,
}: TimeSeriesChartProps) {
  const isMulti = series.length > 1;

  const singlePoints = useMemo(() => {
    if (isMulti || data.length === 0) return [];
    return toPoints(data, series[0].key, xKey);
  }, [data, series, xKey, isMulti]);

  const multiSeries = useMemo((): LivelineSeries[] => {
    if (!isMulti || data.length === 0) return [];
    return series.map((s, i) => {
      const points = toPoints(data, s.key, xKey);
      return {
        id: s.key,
        data: points,
        value: points.length > 0 ? points[points.length - 1].value : 0,
        color: resolveColor(s.color, i),
        label: s.label,
      };
    });
  }, [data, series, xKey, isMulti]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const latestValue =
    singlePoints.length > 0 ? singlePoints[singlePoints.length - 1].value : 0;

  const timeSpan =
    singlePoints.length > 1
      ? singlePoints[singlePoints.length - 1].time - singlePoints[0].time
      : isMulti && multiSeries[0]?.data.length > 1
        ? multiSeries[0].data[multiSeries[0].data.length - 1].time -
          multiSeries[0].data[0].time
        : 300;

  const windowSecs = Math.max(timeSpan * 1.05, 30);

  return (
    <div style={{ height }}>
      {isMulti ? (
        <Liveline
          data={[]}
          value={0}
          series={multiSeries}
          theme="dark"
          color="#a0a0a0"
          window={windowSecs}
          grid
          scrub
          badge={false}
          pulse={false}
          momentum={false}
          fill={false}
          formatValue={(v) => v.toPrecision(4)}
        />
      ) : (
        <Liveline
          data={singlePoints}
          value={latestValue}
          theme="dark"
          color={resolveColor(series[0].color, 0)}
          window={windowSecs}
          grid
          scrub
          badge
          badgeVariant="minimal"
          pulse={false}
          momentum={false}
          formatValue={(v) => v.toPrecision(4)}
        />
      )}
    </div>
  );
}
