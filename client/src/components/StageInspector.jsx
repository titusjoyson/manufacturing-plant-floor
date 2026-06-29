/**
 * StageInspector.jsx — Detailed view of a selected manufacturing stage.
 * Shows sensor readings, equipment state, and material properties.
 */

import { STAGES } from '@shared/stages.js';

export default function StageInspector({ stageId, equipment, materialBatch }) {
  if (!stageId) {
    return (
      <div className="panel-section" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <p className="text-muted" style={{ fontSize: '0.8rem' }}>
          Click a machine in the 3D view to inspect
        </p>
      </div>
    );
  }

  const stage = STAGES[stageId];
  const equip = equipment?.[stageId];
  if (!stage) return null;

  const sensors = equip?.sensors || {};
  const state = equip?.state || 'Unknown';

  const stateColor = state === 'Execute' ? 'var(--accent-green)' :
    state === 'Idle' ? 'var(--accent-cyan)' :
    state === 'Held' ? 'var(--accent-amber)' : 'var(--text-muted)';

  return (
    <div className="panel-section">
      <div className="panel-section__header">
        <h3>Stage Inspector</h3>
        <span className="badge badge--running" style={{ background: `${stateColor}22`, color: stateColor }}>
          <span className="badge__dot" style={{ background: stateColor }}></span>
          {state}
        </span>
      </div>

      <h2 style={{ marginBottom: '4px', fontSize: '0.95rem' }}>{stage.shortName}</h2>
      <p className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '12px' }}>{stage.description}</p>

      {/* Sensor Readings */}
      <div style={{ marginBottom: '16px' }}>
        {Object.entries(sensors).map(([tagId, sensor]) => {
          const qualityClass = sensor.quality === 'Good' ? 'good' :
            sensor.quality === 'Uncertain' ? 'uncertain' : 'bad';

          return (
            <div key={tagId} className="sensor-reading">
              <div>
                <span className="sensor-reading__label">{sensor.name}</span>
                <span className="text-muted" style={{ fontSize: '0.6rem', marginLeft: '6px' }}>
                  {tagId}
                </span>
              </div>
              <span className={`sensor-reading__value sensor-reading__value--${qualityClass}`}>
                {typeof sensor.value === 'number' ? sensor.value.toFixed(2) : sensor.value}
                <span className="text-muted" style={{ fontSize: '0.6rem', marginLeft: '3px' }}>
                  {sensor.unit}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Material Batch Properties */}
      {materialBatch && (
        <div>
          <h3 style={{ marginBottom: '8px' }}>Material Batch</h3>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Mass</span>
            <span className="sensor-reading__value mono">{materialBatch.mass?.toFixed(2)} kg</span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">API Potency</span>
            <span className={`sensor-reading__value mono ${materialBatch.apiPotency < 95 ? 'sensor-reading__value--uncertain' : 'sensor-reading__value--good'}`}>
              {materialBatch.apiPotency?.toFixed(1)}%
            </span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Temperature</span>
            <span className="sensor-reading__value mono">{materialBatch.temperature?.toFixed(1)} °C</span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Density</span>
            <span className="sensor-reading__value mono">{materialBatch.density?.toFixed(3)}</span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Packaged</span>
            <span className="sensor-reading__value mono">{materialBatch.packagedCount || 0} units</span>
          </div>
        </div>
      )}
    </div>
  );
}
