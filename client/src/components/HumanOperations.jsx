/**
 * HumanOperations.jsx — Displays human agent activity (EBR steps, operator actions).
 */

export default function HumanOperations({ ebrSteps, humanActions }) {
  const recentSteps = (ebrSteps || []).slice(-8);
  const recentActions = (humanActions || []).slice(-5);

  return (
    <div className="panel-section">
      <div className="panel-section__header">
        <h3>Human Operations</h3>
        <span className="text-muted" style={{ fontSize: '0.65rem' }}>
          {(ebrSteps || []).length} EBR steps
        </span>
      </div>

      {/* Recent EBR Steps */}
      {recentSteps.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {recentSteps.map((step, i) => (
            <div key={i} style={{
              padding: '6px 0',
              borderBottom: '1px solid hsla(220, 20%, 20%, 0.5)',
              fontSize: '0.7rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>
                  {step.stepType?.replace(/_/g, ' ')}
                </span>
                <span className={`badge badge--${step.status === 'Completed' ? 'complete' : 'running'}`}
                  style={{ fontSize: '0.55rem', padding: '2px 6px' }}>
                  {step.status}
                </span>
              </div>
              <div className="text-muted" style={{ fontSize: '0.6rem', marginTop: '2px' }}>
                {step.operatorName} • {step.stageId?.replace(/_/g, ' ')}
              </div>
              {step.eSignature && (
                <div style={{ fontSize: '0.55rem', color: 'var(--accent-green)', marginTop: '2px' }}>
                  ✓ e-Signed: {step.eSignature.hash?.substring(0, 20)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Human Actions */}
      {recentActions.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '6px', marginTop: '8px' }}>Recent Actions</h3>
          {recentActions.map((action, i) => (
            <div key={i} style={{
              padding: '4px 0',
              borderBottom: '1px solid hsla(220, 20%, 20%, 0.3)',
              fontSize: '0.65rem',
            }}>
              <span style={{ color: 'var(--accent-amber)' }}>{action.role}</span>
              <span className="text-muted"> — </span>
              <span className="text-secondary">{action.action}</span>
            </div>
          ))}
        </div>
      )}

      {recentSteps.length === 0 && recentActions.length === 0 && (
        <p className="text-muted" style={{ fontSize: '0.7rem' }}>
          No operator activity yet
        </p>
      )}
    </div>
  );
}
