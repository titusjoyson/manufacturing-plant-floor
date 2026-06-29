/**
 * MessageConsole.jsx — Live integration message feed.
 * Displays B2MML, MSI, Sparkplug B, Event Frame, EBR, LIMS messages.
 */
import { useState } from 'react';

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

const CATEGORIES = {
  IT: ['B2MML', 'LIMS', 'EWM', 'QM'],
  OT: ['SparkplugB', 'MSI', 'OPCUA'],
  ET: ['PI_EventFrame', 'EBR'],
};

function getMessageSummary(msg) {
  const type = msg.type || '';
  if (type.includes('ProductionSchedule')) {
    if (typeof msg.payload === 'string') {
      const match = msg.payload.match(/<ProductionRequest>\s*<ID>(.*?)<\/ID>/);
      return `Batch ${match ? match[1] : '?'} scheduled`;
    }
    return `Batch ${msg.payload?.productionSchedule?.batchId} scheduled`;
  }
  if (type.includes('ProductionPerformance')) {
    if (typeof msg.payload === 'string') {
      const match = msg.payload.match(/<YieldPercent>(.*?)<\/YieldPercent>/);
      return `Yield: ${match ? match[1] : '?'}%`;
    }
    return `Yield: ${msg.payload?.productionPerformance?.yieldPercent}%`;
  }
  if (type.includes('OrderParameter')) return `Setpoints → ${msg.payload?.equipmentId}`;
  if (type.includes('OrderStatus')) return `${msg.payload?.previousState} → ${msg.payload?.newState}`;
  if (type.includes('Exception')) return `⚠ ${msg.payload?.description}`;
  if (type.includes('NBIRTH')) return `${msg.topic?.split('/').pop()} online`;
  if (type.includes('NDATA')) return `Telemetry update for ${msg.payload?.stageId || '?'}`;
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
  const [filter, setFilter] = useState('All');
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Apply filters
  let filtered = messages;
  if (filter !== 'All') {
    const allowedProtocols = CATEGORIES[filter] || [];
    filtered = filtered.filter(m => allowedProtocols.includes(m.protocol));
  }
  
  // NDATA is extremely noisy. If 'All' is selected, filter it out. 
  // If 'OT' is selected, keep it but limit heavily.
  if (filter === 'All' || filter === 'IT' || filter === 'ET') {
    filtered = filtered.filter(m => !m.type?.includes('NDATA'));
  }

  // Show last 60 messages
  filtered = filtered.slice(-60);

  return (
    <div className="panel-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-section__header" style={{ marginBottom: '8px' }}>
        <h3>Integration Data</h3>
        <span className="text-muted" style={{ fontSize: '0.65rem' }}>{messages.length} total</span>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        {['All', 'IT', 'OT', 'ET'].map(f => (
          <button
            key={f}
            className={`btn btn--sm ${filter === f ? 'btn--primary' : ''}`}
            style={{ flex: 1, padding: '4px' }}
            onClick={() => { setFilter(f); setExpandedIndex(null); }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="message-log" style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <p className="text-muted" style={{ fontSize: '0.7rem', padding: '8px 0', textAlign: 'center' }}>
            No data matched for {filter}
          </p>
        )}
        {filtered.map((msg, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <div 
              key={i} 
              className="message-log__entry" 
              style={{ 
                cursor: 'pointer', 
                flexDirection: 'column', 
                alignItems: 'stretch',
                background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent',
                padding: '4px',
                borderRadius: '4px'
              }}
              onClick={() => setExpandedIndex(isExpanded ? null : i)}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="message-log__protocol" style={{ color: PROTOCOL_COLORS[msg.protocol] || 'var(--text-muted)' }}>
                  {msg.protocol || '???'}
                </span>
                <span className="message-log__direction">{msg.direction?.includes('→') ? '→' : '←'}</span>
                <span className="message-log__content" style={{ flex: 1 }}>{getMessageSummary(msg)}</span>
                <span className="text-muted" style={{ fontSize: '0.6rem' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
              
              {isExpanded && (
                <div style={{ marginTop: '8px', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                  <div style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    <strong>Type:</strong> {msg.type}
                  </div>
                  <div style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    <strong>Time:</strong> {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                  {msg.topic && (
                    <div style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      <strong>Topic:</strong> {msg.topic}
                    </div>
                  )}
                  <pre style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    overflowX: 'auto',
                    marginTop: '8px',
                    color: 'var(--text-primary)',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {typeof msg.payload === 'string' 
                      ? msg.payload 
                      : JSON.stringify(msg.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
