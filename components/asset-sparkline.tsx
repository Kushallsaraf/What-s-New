type AssetSparklineProps = {
  values: number[];
  direction: 'up' | 'down' | 'flat';
  className?: string;
};

export function AssetSparkline({
  values,
  direction,
  className = '',
}: AssetSparklineProps) {
  const width = 180;
  const height = 64;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - minimum) / range) * (height - 10) - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const color =
    direction === 'up' ? '#b9ed72' : direction === 'down' ? '#f6a4a4' : '#e8cc85';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-label={`${direction} illustrative price trend`}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
