/**
 * AlarmBanner.jsx — Active alarm display with acknowledge functionality.
 */

export default function AlarmBanner({ alarms, onAcknowledge }) {
  const activeAlarms = alarms.filter(a => a.status !== 'Cleared');

  if (activeAlarms.length === 0) return null;

  return (
    <div style={{ padding: '0 16px 8px' }}>
      {activeAlarms.slice(-5).map((alarm, i) => (
        <div key={alarm.alarmId || i} className="alarm-banner" style={{ marginBottom: '4px' }}>
          <span style={{ fontSize: '1rem' }}>
            {alarm.severity === 'Critical' ? '🔴' : alarm.severity === 'Warning' ? '🟡' : 'ℹ️'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{alarm.description || alarm.alarmId}</div>
            <div className="text-muted" style={{ fontSize: '0.65rem' }}>
              {alarm.unit || alarm.stage} • {alarm.status}
              {alarm.triggerValue != null && ` • Value: ${alarm.triggerValue}`}
            </div>
          </div>
          {alarm.status === 'Raised' && (
            <button
              className="btn btn--sm btn--danger"
              onClick={() => onAcknowledge(alarm.alarmId)}
            >
              ACK
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
