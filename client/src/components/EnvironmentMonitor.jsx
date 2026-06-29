/**
 * EnvironmentMonitor.jsx — Cleanroom environment monitor with particle counts.
 */

export default function EnvironmentMonitor({ equipment }) {
  const env = equipment?.ENVIRONMENT;
  if (!env) return null;

  const sensors = env.sensors || {};
  const pc05 = sensors['PC-ENV-05'];
  const pc50 = sensors['PC-ENV-50'];
  const temp = sensors['TT-ENV'];
  const humidity = sensors['HT-ENV'];

  const gradeALimit05 = 3520;
  const gradeALimit50 = 20;

  const pc05Pct = pc05 ? Math.min(100, (pc05.value / gradeALimit05) * 100) : 0;
  const pc50Pct = pc50 ? Math.min(100, (pc50.value / gradeALimit50) * 100) : 0;

  return (
    <div className="panel-section">
      <div className="panel-section__header">
        <h3>Environment</h3>
        <span className="badge badge--idle" style={{ fontSize: '0.55rem', padding: '2px 6px' }}>
          Grade A
        </span>
      </div>

      {/* Particle bars */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
          <span className="text-secondary">Particles ≥0.5µm</span>
          <span className="mono" style={{
            color: pc05Pct > 80 ? 'var(--accent-red)' : pc05Pct > 60 ? 'var(--accent-amber)' : 'var(--accent-green)',
          }}>
            {pc05?.value?.toFixed(0) || '—'} / {gradeALimit05}
          </span>
        </div>
        <div className="progress-bar" style={{ height: '6px' }}>
          <div className="progress-bar__fill" style={{
            width: `${pc05Pct}%`,
            background: pc05Pct > 80
              ? 'linear-gradient(90deg, var(--accent-amber), var(--accent-red))'
              : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-green))',
          }}></div>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
          <span className="text-secondary">Particles ≥5.0µm</span>
          <span className="mono" style={{
            color: pc50Pct > 80 ? 'var(--accent-red)' : pc50Pct > 60 ? 'var(--accent-amber)' : 'var(--accent-green)',
          }}>
            {pc50?.value?.toFixed(1) || '—'} / {gradeALimit50}
          </span>
        </div>
        <div className="progress-bar" style={{ height: '6px' }}>
          <div className="progress-bar__fill" style={{
            width: `${pc50Pct}%`,
            background: pc50Pct > 80
              ? 'linear-gradient(90deg, var(--accent-amber), var(--accent-red))'
              : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-green))',
          }}></div>
        </div>
      </div>

      {/* Temp & Humidity */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
        <div>
          <span className="text-muted" style={{ fontSize: '0.6rem' }}>TEMP</span>
          <div className="mono" style={{ color: 'var(--accent-cyan)' }}>
            {temp?.value?.toFixed(1) || '—'}°C
          </div>
        </div>
        <div>
          <span className="text-muted" style={{ fontSize: '0.6rem' }}>HUMIDITY</span>
          <div className="mono" style={{ color: 'var(--accent-cyan)' }}>
            {humidity?.value?.toFixed(1) || '—'}%
          </div>
        </div>
      </div>
    </div>
  );
}
