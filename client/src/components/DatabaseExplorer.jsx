/**
 * DatabaseExplorer.jsx — Historical IT/OT/ET Database Auditor
 * Queries, searches, paginates, and inspects raw recorded payloads from the API server.
 */

import { useState, useEffect, useCallback } from 'react';

const COLLECTIONS = [
  { id: 'messages', label: '📡 Integration Messages', desc: 'Enterprise integration payloads (B2MML XML, PAS-X MSI, LIMS, EWM)' },
  { id: 'batches', label: '📦 Process Batches', desc: 'SAP PP-PI process orders, lot traceability, and final batch parameters' },
  { id: 'telemetry', label: '📈 Telemetry Logs', desc: 'High-frequency physical sensor logs (temperature, pressure, speed)' },
  { id: 'alarms', label: '🚨 Alarms & Exceptions', desc: 'Downtime events, safety thresholds, and operator acknowledgements' },
  { id: 'ebr', label: '📝 EBR Step Records', desc: 'Werum PAS-X compliance logs, operator badges, and e-signatures' },
  { id: 'lims', label: '🧪 LIMS Quality Samples', desc: 'LabWare LIMS HPLC assays, dissolution specs, and QM inspection lots' }
];

const PROTOCOLS = ['B2MML', 'MSI', 'LIMS', 'EWM', 'QM', 'SparkplugB'];
const STAGES = [
  { id: 'SOLUTION_PREP', label: 'Solution Prep' },
  { id: 'DRUM_FREEZING', label: 'Drum Freeze' },
  { id: 'LYOPHILIZATION', label: 'Lyophilization' },
  { id: 'EQUILIBRATION', label: 'Equilibration' },
  { id: 'COMPACTION', label: 'Compaction' },
  { id: 'MELT_EXTRUSION', label: 'Melt Extrusion' },
  { id: 'CUTTING', label: 'Cutting' },
  { id: 'CHECKWEIGHING', label: 'Checkweighing' },
  { id: 'PACKAGING', label: 'Packaging' }
];

export default function DatabaseExplorer() {
  const [collection, setCollection] = useState('messages');
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Custom filters
  const [protocolFilter, setProtocolFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [batchIdFilter, setBatchIdFilter] = useState('');
  
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch handler
  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectedRecord(null);
    try {
      let url = '';
      const offset = page * limit;
      
      switch (collection) {
        case 'messages':
          // Fetch paginated messages
          url = `/api/messages?limit=${limit}&offset=${offset}`;
          if (protocolFilter) {
            url = `/api/messages/protocol/${protocolFilter}?limit=${limit}&offset=${offset}`;
          }
          break;
        case 'batches':
          url = `/api/batches`;
          break;
        case 'telemetry':
          url = `/api/telemetry?limit=200`;
          if (stageFilter) {
            url += `&stageId=${stageFilter}`;
          }
          break;
        case 'alarms':
          url = `/api/alarms?limit=200`;
          if (severityFilter) {
            url += `&severity=${severityFilter}`;
          }
          break;
        case 'ebr':
          url = `/api/ebr`;
          if (batchIdFilter) {
            url += `?batchId=${batchIdFilter}`;
          }
          break;
        case 'lims':
          url = `/api/lims/samples`;
          if (batchIdFilter) {
            url += `?batchId=${batchIdFilter}`;
          }
          break;
        default:
          break;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('API server returned error status');
      const payload = await res.json();
      
      let fetchedList = [];
      if (Array.isArray(payload)) {
        fetchedList = payload;
      } else if (payload.data && Array.isArray(payload.data)) {
        fetchedList = payload.data;
      }

      // Sort chronological descending (newest first) by timestamp or recordedAt
      fetchedList.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.recordedAt || a.timestampStarted || 0);
        const timeB = new Date(b.timestamp || b.recordedAt || b.timestampStarted || 0);
        return timeB - timeA;
      });

      setRecords(fetchedList);
      setTotalCount(payload.total !== undefined ? payload.total : fetchedList.length);
    } catch (err) {
      console.error('[Explorer] Fetch failed:', err);
      setRecords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [collection, page, limit, protocolFilter, stageFilter, severityFilter, batchIdFilter]);

  // Refetch when dependencies shift
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination when collection switches
  const handleCollectionSwitch = (collId) => {
    setCollection(collId);
    setPage(0);
    setSearchQuery('');
    setProtocolFilter('');
    setStageFilter('');
    setSeverityFilter('');
    setBatchIdFilter('');
  };

  // Perform client-side search/filter on top of API slice
  const filteredRecords = records.filter(rec => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    
    // Check fields
    const typeMatch = rec.type && rec.type.toLowerCase().includes(searchLower);
    const idMatch = rec.id && rec.id.toString().toLowerCase().includes(searchLower);
    const batchMatch = rec.batchId && rec.batchId.toLowerCase().includes(searchLower);
    const topicMatch = rec.topic && rec.topic.toLowerCase().includes(searchLower);
    
    // Check stringified payload content
    const rawPayload = JSON.stringify(rec.payload || rec).toLowerCase();
    const payloadMatch = rawPayload.includes(searchLower);
    
    return typeMatch || idMatch || batchMatch || topicMatch || payloadMatch;
  });

  // Database Reset Action
  const handleResetDatabase = async () => {
    if (!window.confirm('WARNING: This will permanently wipe all integration messages, batches, alarms, and historical telemetry logs from the database store. Proceed?')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) throw new Error('API reset failed');
      console.log('[Explorer] Database reset successfully');
      setPage(0);
      fetchData();
    } catch (err) {
      alert('Error resetting database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', padding: '16px', boxSizing: 'border-box' }}>
      
      {/* ── Left Sidebar: Collections selector ── */}
      <div className="glass-panel" style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
          Database Tables
        </div>
        {COLLECTIONS.map(coll => (
          <button
            key={coll.id}
            onClick={() => handleCollectionSwitch(coll.id)}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '6px',
              border: `1px solid ${collection === coll.id ? 'var(--accent-cyan)' : 'transparent'}`,
              background: collection === coll.id ? 'rgba(0, 255, 204, 0.05)' : 'var(--bg-tertiary)',
              color: collection === coll.id ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: collection === coll.id ? 700 : 500,
              transition: 'all 0.2s ease',
            }}
          >
            {coll.label}
          </button>
        ))}

        {/* Database Stats card */}
        <div className="glass-panel" style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            COLLECTION INFO
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            {COLLECTIONS.find(c => c.id === collection)?.desc}
          </div>
        </div>

        {/* Global Reset Action */}
        <button
          onClick={handleResetDatabase}
          className="btn btn--sm"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            marginTop: '8px',
            fontSize: '0.65rem',
            padding: '8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🚨 Wipe Database
        </button>
      </div>

      {/* ── Main Panel: Filters, Grid Table, Payload Inspector ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
        
        {/* Top Horizontal Filter Bar */}
        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', alignItems: 'center' }}>
          
          {/* Global Search */}
          <input
            type="text"
            placeholder="Search within records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="explorer-input"
            style={{ flex: 1, minWidth: '150px' }}
          />

          {/* Collection-specific filters */}
          {collection === 'messages' && (
            <select
              value={protocolFilter}
              onChange={(e) => { setProtocolFilter(e.target.value); setPage(0); }}
              className="explorer-select"
            >
              <option value="">All Protocols</option>
              {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {collection === 'telemetry' && (
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="explorer-select"
            >
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}

          {collection === 'alarms' && (
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="explorer-select"
            >
              <option value="">All Severities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          )}

          {(collection === 'ebr' || collection === 'lims') && (
            <input
              type="text"
              placeholder="Filter by Batch ID..."
              value={batchIdFilter}
              onChange={(e) => setBatchIdFilter(e.target.value)}
              className="explorer-input"
              style={{ width: '130px' }}
            />
          )}

          {/* Refresh Action */}
          <button
            onClick={fetchData}
            className="btn btn--sm"
            style={{ fontSize: '0.65rem', padding: '6px 12px' }}
          >
            🔄 Refresh
          </button>

          {/* Pagination (visible when offset paging is used) */}
          {collection === 'messages' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                className="btn btn--sm"
                style={{ opacity: page === 0 ? 0.4 : 1, padding: '4px 8px', fontSize: '0.65rem' }}
              >
                ◄ Prev
              </button>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                Page {page + 1}
              </span>
              <button
                disabled={filteredRecords.length < limit || loading}
                onClick={() => setPage(prev => prev + 1)}
                className="btn btn--sm"
                style={{ opacity: filteredRecords.length < limit ? 0.4 : 1, padding: '4px 8px', fontSize: '0.65rem' }}
              >
                Next ►
              </button>
            </div>
          )}
        </div>

        {/* Lower Row: Split Pane Grid Table & Details Panel */}
        <div style={{ flex: 1, display: 'flex', gap: '16px', minHeight: 0 }}>
          
          {/* Left: Scrollable Data List Table */}
          <div className="glass-panel" style={{ flex: 1.3, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            {loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Loading records from database...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '32px' }}>
                📭 No records found matching the active query or filter criteria.
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className="explorer-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>{collection === 'messages' ? 'Protocol / Type' : collection === 'telemetry' ? 'Stage' : 'ID / Event'}</th>
                      <th>Summary Info</th>
                      <th>Status / Val</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((rec, i) => {
                      const id = rec.id || rec.messageId || rec.batchId || rec.alarmId || i;
                      const isSelected = selectedRecord && (selectedRecord.id === rec.id || selectedRecord.messageId === rec.messageId || selectedRecord.batchId === rec.batchId || JSON.stringify(selectedRecord) === JSON.stringify(rec));
                      
                      // Format cell fields dynamically
                      const timeStr = new Date(rec.timestamp || rec.recordedAt || rec.timestampStarted || 0).toLocaleTimeString();
                      let labelCol = '';
                      let summaryCol = '';
                      let badgeVal = '';
                      
                      if (collection === 'messages') {
                        labelCol = `${rec.protocol || 'JSON'} : ${rec.type || 'MSG'}`;
                        summaryCol = rec.topic || 'Internal emitter event';
                        badgeVal = rec.payload ? 'payload' : 'empty';
                      } else if (collection === 'batches') {
                        labelCol = rec.batchId;
                        summaryCol = `Order: ${rec.processOrder || 'N/A'} • Product: ${rec.productName || 'PLGA depot'}`;
                        badgeVal = `${rec.actualYieldQuantity || 0} EA`;
                      } else if (collection === 'telemetry') {
                        labelCol = rec.stageId;
                        summaryCol = Object.entries(rec.sensors || {}).slice(0, 1).map(([k, v]) => `${v.name}: ${v.value.toFixed(1)} ${v.unit}`).join('');
                        badgeVal = 'time-series';
                      } else if (collection === 'alarms') {
                        labelCol = rec.equipmentId;
                        summaryCol = rec.description || 'Dev deviation hold';
                        badgeVal = rec.severity;
                      } else if (collection === 'ebr') {
                        labelCol = rec.stageId;
                        summaryCol = `SOP Step: ${rec.stepName || 'N/A'}`;
                        badgeVal = rec.signature?.badgeScanned ? 'E-SIG' : 'PENDING';
                      } else if (collection === 'lims') {
                        labelCol = rec.sampleId;
                        summaryCol = `Test: ${rec.testName || 'Quality evaluation'}`;
                        badgeVal = rec.result || 'PENDING';
                      }

                      return (
                        <tr
                          key={id}
                          className={isSelected ? 'selected' : ''}
                          onClick={() => setSelectedRecord(rec)}
                        >
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>{timeStr}</td>
                          <td style={{ fontWeight: 600 }}>{labelCol}</td>
                          <td style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{summaryCol}</td>
                          <td>
                            <span className="badge" style={{
                              background: badgeVal === 'High' || badgeVal === 'FAILED' ? 'rgba(239, 68, 68, 0.1)' : badgeVal === 'Execute' || badgeVal === 'E-SIG' || badgeVal === 'PASSED' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)',
                              color: badgeVal === 'High' || badgeVal === 'FAILED' ? '#ef4444' : badgeVal === 'Execute' || badgeVal === 'E-SIG' || badgeVal === 'PASSED' ? '#22c55e' : 'var(--text-secondary)',
                              fontSize: '0.55rem',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {badgeVal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Detailed Indented Payload Code Inspector */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: '16px' }}>
            {selectedRecord ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                
                {/* Panel Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>PAYLOAD METADATA</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                      {selectedRecord.type || selectedRecord.batchId || selectedRecord.sampleId || 'Inspection Details'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(typeof (selectedRecord.payload || selectedRecord) === 'string' ? (selectedRecord.payload || selectedRecord) : JSON.stringify(selectedRecord.payload || selectedRecord, null, 2))}
                    className="btn btn--sm"
                    style={{ fontSize: '0.6rem', padding: '4px 8px' }}
                  >
                    {copySuccess ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>

                {/* Sub info */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  <span><strong>Time:</strong> {new Date(selectedRecord.timestamp || selectedRecord.recordedAt || 0).toLocaleString()}</span>
                  {selectedRecord.protocol && <span><strong>Protocol:</strong> {selectedRecord.protocol}</span>}
                </div>

                {/* Raw Code Area */}
                <pre style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--surface-border)',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  color: 'var(--text-primary)',
                  overflow: 'auto',
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {typeof (selectedRecord.payload || selectedRecord) === 'string'
                    ? (selectedRecord.payload || selectedRecord)
                    : JSON.stringify(selectedRecord.payload || selectedRecord, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', border: '1px dashed var(--surface-border)', borderRadius: '4px' }}>
                🔍 Click on a table row row to audit its complete XML or JSON payload structure.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
