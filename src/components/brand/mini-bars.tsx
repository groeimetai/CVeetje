interface MiniBarsProps {
  values: number[];
  color?: string;
}

export function MiniBars({ values, color = 'var(--ink-soft)' }: MiniBarsProps) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <svg width="76" height="22" viewBox="0 0 76 22" style={{ display: 'block' }} aria-hidden="true">
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * 20);
        return (
          <rect
            key={i}
            x={i * 8}
            y={22 - h}
            width="5"
            height={h}
            rx="1.5"
            fill={color}
            opacity={0.4 + (v / max) * 0.6}
          />
        );
      })}
    </svg>
  );
}
