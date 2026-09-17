import { useId } from 'react';

type Props = {
  size?: number;
  tone?: 'brand' | 'light';
  withWordmark?: boolean;
};

const CROIX =
  'M16 3.6h8a2.4 2.4 0 0 1 2.4 2.4v7.6H34a2.4 2.4 0 0 1 2.4 2.4v8a2.4 2.4 0 0 1-2.4 2.4h-7.6V34a2.4 2.4 0 0 1-2.4 2.4h-8A2.4 2.4 0 0 1 13.6 34v-7.6H6a2.4 2.4 0 0 1-2.4-2.4v-8A2.4 2.4 0 0 1 6 13.6h7.6V6A2.4 2.4 0 0 1 16 3.6Z';

export function Logo({ size = 40, tone = 'brand', withWordmark = false }: Props) {
  const clip = useId();
  const clair = tone === 'light';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.28 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <clipPath id={clip}>
          <rect x="20" y="0" width="20" height="40" />
        </clipPath>
        <path d={CROIX} fill={clair ? 'var(--sky-200)' : 'var(--teal-400)'} />
        <g clipPath={`url(#${clip})`}>
          <path d={CROIX} fill={clair ? 'var(--white)' : 'var(--brand-600)'} />
        </g>
      </svg>

      {withWordmark && (
        <span
          style={{
            fontSize: size * 0.62,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: clair ? 'var(--white)' : 'var(--ink-900)' }}>Infi</span>
          <span style={{ color: clair ? 'var(--sky-200)' : 'var(--brand-600)' }}>Match</span>
        </span>
      )}
    </span>
  );
}
