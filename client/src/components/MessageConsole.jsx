/**
 * MessageConsole.jsx — Live integration message feed.
 * Displays B2MML, MSI, Sparkplug B, Event Frame, EBR, LIMS messages.
 */

const PROTOCOL_COLORS = {
  B2MML: 'var(--accent-blue)',
  MSI: 'var(--accent-amber)',
  SparkplugB: 'var(--accent-green)',
  PI_EventFrame: 'var(--accent-purple)',
  EBR: 'var(--accent-cyan)',
  LIMS: 'var(--accent-red)',
  EWM: 'var(--text-secondary)',
  QM: 'var(--accent-amber)',
};

function getMessageSummary(msg) {
  const type = msg.type || '';
  if (type.includes('ProductionSchedule')) return `Batch ${msg.payload?.productionSchedule?.batchId} scheduled`;
  if (type.includes('ProductionPerformance')) return `Yield: ${msg.payload?.productionPerformance?.yieldPercent}%`;
  if (type.includes('OrderParameter')) return `Setpoints → ${msg.payload?.equipmentId}`;
  if (type.includes('OrderStatus')) return `${msg.payload?.previousState} → ${msg.payload?.newState}`;
  if (type.includes('Exception')) return `⚠ ${msg.payload?.description}`;
  if (type.includes('NBIRTH')) return `${msg.topic?.split('/').pop()} online`;
  if (type.includes('NDATA')) return `Telemetry update`;
  if (type.includes('NDEATH')) return `Equipment offline`;
  if (type.includes('EventFrame_Open')) return `Phase: ${msg.payload?.phaseName}`;
  if (type.includes('EventFrame_Close')) return `Phase complete`;
  if (type.includes('EBR')) return `Step: ${msg.payload?.stepType}`;
  if (type.includes('Sample')) return `Sample ${msg.payload?.sampleId}`;
  if (type.includes('TestResult')) return `QC: ${msg.payload?.decision}`;
  if (type.includes('Staging')) return `Materials staged`;
  if (type.includes('UsageDecision')) return `Decision: ${msg.payload?.decision}`;
  return type.split('_').pop();
}

export default function MessageConsole({ messages }) {
  // Show last 40 messages, skip frequent NDATA
  const filtered = messages
    .filter(m => !m.type?.includes('NDATA'))
    .slice(-40);

  return (
    <div className="panel-section">
      <div className="panel-section__header">
        <h3>Integration Messages</h3>
        <span className="text-muted" style={{ fontSize: '0.65rem' }}>{messages.length} total</span>
      </div>

      <div className="message-log">
        {filtered.length === 0 && (
          <p className="text-muted" style={{ fontSize: '0.7rem', padding: '8px 0' }}>
            No messages yet — start the campaign
          </p>
        )}
        {filtered.map((msg, i) => (
          <div key={i} className="message-log__entry">
            <span className="message-log__protocol" style={{ color: PROTOCOL_COLORS[msg.protocol] || 'var(--text-muted)' }}>
              {msg.protocol || '???'}
            </span>
            <span className="message-log__direction">{msg.direction?.includes('→') ? '→' : '←'}</span>
            <span className="message-log__content">{getMessageSummary(msg)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
