/**
 * ControlPanel.jsx — Campaign controls, speed, and fault injection.
 */

import { FAULT_SCENARIOS } from '@shared/wsProtocol.js';

export default function ControlPanel({
  campaign,
  clock,
  connected,
  onStart,
  onPause,
  onResume,
  onSetSpeed,
  onInjectFault,
}) {
  const phase = campaign?.phase || 'NOT_STARTED';
  const isRunning = phase !== 'NOT_STARTED' && phase !== 'COMPLETE';
  const isPaused = clock?.paused;

  return (
    <div className="panel-section">
      <div className="panel-section__header">
        <h3>Controls</h3>
        <span className="badge" style={{
          background: connected ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
          color: connected ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          <span className="badge__dot"></span>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Campaign control */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {!isRunning ? (
          <button className="btn btn--primary" onClick={onStart} disabled={!connected}>
            ▶ Start Campaign
          </button>
        ) : (
          <>
            <button className="btn" onClick={isPaused ? onResume : onPause}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          </>
        )}
      </div>

      {/* Speed controls */}
      <div className="speed-controls" style={{ marginBottom: '12px' }}>
        <span className="text-muted" style={{ fontSize: '0.7rem' }}>Speed:</span>
        {[10, 50, 100, 200].map(speed => (
          <button
            key={speed}
            className={`btn btn--sm ${clock?.timeScale === speed ? 'btn--primary' : ''}`}
            onClick={() => onSetSpeed(speed)}
          >
            {speed}×
          </button>
        ))}
      </div>

      {/* Campaign info */}
      {campaign && (
        <div style={{ fontSize: '0.75rem', marginBottom: '12px' }}>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Phase</span>
            <span className="sensor-reading__value" style={{ color: 'var(--accent-cyan)' }}>{phase}</span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Batch</span>
            <span className="sensor-reading__value mono">{campaign.currentBatch}/{campaign.totalBatches}</span>
          </div>
          {campaign.stageProgress > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>Stage Progress</span>
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>
                  {(campaign.stageProgress * 100).toFixed(0)}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${campaign.stageProgress * 100}%` }}></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fault injection */}
      {isRunning && (
        <div>
          <h3 style={{ marginBottom: '6px' }}>Inject Fault</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {Object.values(FAULT_SCENARIOS).map(fault => (
              <button
                key={fault.id}
                className="btn btn--sm btn--danger"
                onClick={() => onInjectFault(fault.id)}
                title={fault.description}
              >
                {fault.name.substring(0, 20)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
