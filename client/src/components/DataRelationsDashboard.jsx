/**
 * DataRelationsDashboard.jsx — ISA-95 Cyber-Physical Relationships
 * Visualizes relationships between ERP (L4), MES (L3), and SCADA (L1/2).
 * Inspects live integration data payloads directly in context.
 */

import { useState, useMemo } from 'react';

const NODE_INFO = {
  ERP_SCHEDULE: {
    title: 'ERP Production Schedule',
    simpleTitle: '1. Plan Order (SAP ERP)',
    level: 'Level 4 (Enterprise)',
    protocol: 'B2MML (XML)',
    description: 'SAP ERP schedules production orders (B2MML ProductionSchedule) detailing the product, target quantity (5000 EA), and release codes. Emitted at campaign release.',
    simpleDescription: 'SAP Enterprise Resource Planning (ERP) starts the schedule, telling the factory which drug to make, when, and how much (e.g. 5000 syringes). This acts as the master planning order.'
  },
  EWM_STAGING: {
    title: 'EWM Warehouse Staging',
    simpleTitle: '2. Prepare Materials (SAP EWM)',
    level: 'Level 4 (Warehouse)',
    protocol: 'SAP EWM (JSON)',
    description: 'SAP Extended Warehouse Management stages raw materials (PLGA polymer, Goserelin API, syringe barrels) to the line and publishes stock transfer slips.',
    simpleDescription: 'SAP Extended Warehouse Management reserves and moves physical raw materials (the Goserelin active powder, polymer, syringe parts) from warehouse shelves to the preparation area.'
  },
  MES_CAMPAIGN: {
    title: 'MES Campaign Coordinator',
    simpleTitle: '3. Start Recipe (Werum PAS-X)',
    level: 'Level 3 (Execution)',
    protocol: 'Werum PAS-X MSI (JSON)',
    description: 'Orchestrates the campaign execution. Translates Level 4 orders into Level 3 PackML state commands, tracking nominal stage timings, yields, and throughputs.',
    simpleDescription: 'The Manufacturing Execution System (MES) acts as the factory director. It coordinates the recipe instructions, tells machines to reset, and tracks nominal run timers and product count.'
  },
  EBR_COMPLIANCE: {
    title: 'Electronic Batch Record (EBR)',
    simpleTitle: '4. Sign Off Steps (EBR compliance)',
    level: 'Level 3 (Compliance)',
    protocol: 'PAS-X EBR (JSON)',
    description: 'Secures process parameters, line clearance checklists, and GMP logs. Captures operator badge scans and electronic signatures (21 CFR Part 11) at every stage exit.',
    simpleDescription: 'The Electronic Batch Record is a digital safety log. Operators scan their security badges to digitally sign checklist items (like sanitization), ensuring compliance with strict healthcare regulations.'
  },
  SCADA_TELEMETRY: {
    title: 'SCADA Telemetry (UNS)',
    simpleTitle: '5. Run Equipment (OPC UA / MQTT)',
    level: 'Level 1/2 (Control)',
    protocol: 'OPC UA / Sparkplug B',
    description: 'Live physical telemetry (sensors: temperature, moisture, diameter) published via OPC UA nodes and Sparkplug B specifications in the Unified Namespace.',
    simpleDescription: 'Physical hardware sensors log real-time telemetry (heaters, vacuums, scales, flow meters) which stream to a centralized data broker called a Unified Namespace (UNS).'
  },
  SCADA_ALARMS: {
    title: 'Machine Alarms & Exceptions',
    simpleTitle: '6. Handle Faults (Exceptions)',
    level: 'Level 1/2 (Safety)',
    protocol: 'MSI Exception (JSON)',
    description: 'SCADA exception alerts (e.g. over-temp or vacuum loss) mapped to MSI exceptions, prompting operator acknowledgement and line hold commands.',
    simpleDescription: 'If sensors detect that variables are drifting out of bounds (like overheating or pressure drops), the system triggers safety alarms, holding the line until a supervisor resolves it.'
  },
  LIMS_QUALITY: {
    title: 'LIMS Quality Testing',
    simpleTitle: '7. Lab Quality Tests (LabWare LIMS)',
    level: 'Level 3/4 (LIMS)',
    protocol: 'LabWare LIMS (JSON)',
    description: 'LabWare LIMS receives finished syringe samples at packaging, performs dissolution & HPLC assay specs, and returns passed/failed results.',
    simpleDescription: 'LabWare LIMS (Laboratory Information Management) logs chemical testing of finished samples in the lab, analyzing active drug concentrations and sterility specs to approve or fail them.'
  },
  QM_DECISION: {
    title: 'QM Usage Decision',
    simpleTitle: '8. Release Batch (SAP QM)',
    level: 'Level 4 (Quality)',
    protocol: 'SAP QM (JSON)',
    description: 'Quality Management usage decision (Released vs. Quarantine) submitted to SAP based on LIMS approval. Releases the batch to inventory or blocks it.',
    simpleDescription: 'SAP Quality Management processes LIMS lab results to make a final Usage Decision. A positive decision releases the entire batch to inventory for customer shipping; otherwise, it is blocked.'
  },
  ERP_PERFORMANCE: {
    title: 'ERP Production Performance',
    simpleTitle: '9. Close Order (SAP Settlement)',
    level: 'Level 4 (Enterprise)',
    protocol: 'B2MML (XML)',
    description: 'MES registers finished syringe counts, material lots consumed, and yields, sending a B2MML ProductionPerformance XML back to ERP to close the order.',
    simpleDescription: 'Once execution is complete, final yields, raw materials used, and labor times are sent back to the main ERP system, settling the ledger and closing the production order.'
  }
};

function ArrowRight() {
  return (
    <div style={{
      color: 'var(--accent-cyan)',
      fontSize: '0.9rem',
      fontWeight: 'bold',
      textShadow: '0 0 5px rgba(0,255,204,0.4)',
      userSelect: 'none'
    }}>
      ➔
    </div>
  );
}

function ArrowLeft() {
  return (
    <div style={{
      color: 'var(--accent-cyan)',
      fontSize: '0.9rem',
      fontWeight: 'bold',
      textShadow: '0 0 5px rgba(0,255,204,0.4)',
      userSelect: 'none'
    }}>
      ⮜
    </div>
  );
}

function ArrowDown() {
  return (
    <div style={{
      color: 'var(--accent-cyan)',
      fontSize: '0.9rem',
      fontWeight: 'bold',
      textShadow: '0 0 5px rgba(0,255,204,0.4)',
      userSelect: 'none',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      ▼
    </div>
  );
}

export default function DataRelationsDashboard({ messages }) {
  const [selectedNodeId, setSelectedNodeId] = useState('ERP_SCHEDULE');
  const [perspective, setPerspective] = useState('simple'); // 'simple' or 'expert'

  // Find latest message for each node type to display "Actual Data"
  const nodesData = useMemo(() => {
    const latest = {};

    messages.forEach(msg => {
      const type = msg.type || '';
      
      if (type.includes('ProductionSchedule')) {
        latest['ERP_SCHEDULE'] = msg;
      }
      if (type.includes('EWM_Staging')) {
        latest['EWM_STAGING'] = msg;
      }
      if (type.includes('OrderStatus')) {
        latest['MES_CAMPAIGN'] = msg;
      }
      if (type.includes('EBR_StepRecord')) {
        latest['EBR_COMPLIANCE'] = msg;
      }
      if (type.includes('SparkplugB_NDATA')) {
        latest['SCADA_TELEMETRY'] = msg;
      }
      if (type.includes('Exception')) {
        latest['SCADA_ALARMS'] = msg;
      }
      if (type.includes('Sample') || type.includes('TestResult')) {
        latest['LIMS_QUALITY'] = msg;
      }
      if (type.includes('UsageDecision')) {
        latest['QM_DECISION'] = msg;
      }
      if (type.includes('ProductionPerformance')) {
        latest['ERP_PERFORMANCE'] = msg;
      }
    });

    return latest;
  }, [messages]);

  const selectedNode = NODE_INFO[selectedNodeId];
  const selectedMsg = nodesData[selectedNodeId];

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%', padding: '12px', boxSizing: 'border-box' }}>
      
      {/* ── Left Pane: Cyber-Physical Mapping Flowchart ── */}
      <div className="glass-panel" style={{ flex: 1.3, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊 Data & System Relationships</span>
          </h3>
          
          {/* Layman vs Expert Perspective Toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--surface-border)' }}>
            <button
              onClick={() => setPerspective('simple')}
              style={{
                background: perspective === 'simple' ? 'var(--accent-cyan)' : 'transparent',
                color: perspective === 'simple' ? '#000' : 'var(--text-secondary)',
                border: 'none',
                padding: '2px 8px',
                fontSize: '0.55rem',
                fontWeight: 700,
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              👤 Plain English
            </button>
            <button
              onClick={() => setPerspective('expert')}
              style={{
                background: perspective === 'expert' ? 'var(--accent-cyan)' : 'transparent',
                color: perspective === 'expert' ? '#000' : 'var(--text-secondary)',
                border: 'none',
                padding: '2px 8px',
                fontSize: '0.55rem',
                fontWeight: 700,
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ⚙ ISA-95 Expert
            </button>
          </div>
        </div>

        <p className="text-muted" style={{ fontSize: '0.65rem', marginBottom: '20px' }}>
          {perspective === 'simple' 
            ? 'Trace the chronological steps of how medicine orders plan, prepare, run, test, and settle inside the system.'
            : 'Trace the structured data flows between enterprise L4 ERP, execution L3 MES/LIMS, and automation L1/2 SCADA layers.'}
        </p>

        {/* 3x3 Flowchart Grid Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 30px 1fr 30px 1fr',
          gridTemplateRows: 'auto 30px auto 30px auto',
          alignItems: 'center',
          justifyItems: 'center',
          gap: '4px',
          padding: '4px'
        }}>
          
          {/* Row 1 */}
          <NodeCard
            id="ERP_SCHEDULE"
            title={perspective === 'simple' ? "1. Plan Order" : "1. ERP Schedule"}
            subtitle={perspective === 'simple' ? "SAP ERP Planning" : "B2MML ProductionSchedule"}
            active={selectedNodeId === 'ERP_SCHEDULE'}
            hasData={!!nodesData['ERP_SCHEDULE']}
            onClick={setSelectedNodeId}
          />
          <ArrowRight />
          <NodeCard
            id="EWM_STAGING"
            title={perspective === 'simple' ? "2. Stage Materials" : "2. Warehouse Staging"}
            subtitle={perspective === 'simple' ? "SAP EWM Staging Slip" : "SAP EWM Staging Slip"}
            active={selectedNodeId === 'EWM_STAGING'}
            hasData={!!nodesData['EWM_STAGING']}
            onClick={setSelectedNodeId}
          />
          <ArrowRight />
          <NodeCard
            id="MES_CAMPAIGN"
            title={perspective === 'simple' ? "3. Start Recipe" : "3. MES Orchestrator"}
            subtitle={perspective === 'simple' ? "PAS-X Recipe Setup" : "PAS-X Status Logs"}
            active={selectedNodeId === 'MES_CAMPAIGN'}
            hasData={!!nodesData['MES_CAMPAIGN']}
            onClick={setSelectedNodeId}
          />

          {/* Row 1 to Row 2 Transition (Right side down arrow) */}
          <div></div><div></div><div></div><div></div>
          <ArrowDown />

          {/* Row 2 (Reversed direction: right-to-left flow) */}
          <NodeCard
            id="SCADA_ALARMS"
            title={perspective === 'simple' ? "6. Safety Holds" : "6. SCADA Exceptions"}
            subtitle={perspective === 'simple' ? "Alarm Exceedances" : "MSI Exception Alert"}
            active={selectedNodeId === 'SCADA_ALARMS'}
            hasData={!!nodesData['SCADA_ALARMS']}
            onClick={setSelectedNodeId}
          />
          <ArrowLeft />
          <NodeCard
            id="SCADA_TELEMETRY"
            title={perspective === 'simple' ? "5. Sensor Metrics" : "5. SCADA Telemetry"}
            subtitle={perspective === 'simple' ? "Continuous Logs" : "OPC UA / Sparkplug B"}
            active={selectedNodeId === 'SCADA_TELEMETRY'}
            hasData={!!nodesData['SCADA_TELEMETRY']}
            onClick={setSelectedNodeId}
          />
          <ArrowLeft />
          <NodeCard
            id="EBR_COMPLIANCE"
            title={perspective === 'simple' ? "4. Compliance Signatures" : "4. EBR Steps & E-Sig"}
            subtitle={perspective === 'simple' ? "Operator Sign-Offs" : "PAS-X EBR Compliance"}
            active={selectedNodeId === 'EBR_COMPLIANCE'}
            hasData={!!nodesData['EBR_COMPLIANCE']}
            onClick={setSelectedNodeId}
          />

          {/* Row 2 to Row 3 Transition (Left side down arrow) */}
          <ArrowDown />
          <div></div><div></div><div></div><div></div>

          {/* Row 3 */}
          <NodeCard
            id="LIMS_QUALITY"
            title={perspective === 'simple' ? "7. Lab Quality Tests" : "7. QC Testing LIMS"}
            subtitle={perspective === 'simple' ? "LabWare Approvals" : "LabWare Samples"}
            active={selectedNodeId === 'LIMS_QUALITY'}
            hasData={!!nodesData['LIMS_QUALITY']}
            onClick={setSelectedNodeId}
          />
          <ArrowRight />
          <NodeCard
            id="QM_DECISION"
            title={perspective === 'simple' ? "8. Quality Release" : "8. Usage Decision"}
            subtitle={perspective === 'simple' ? "SAP QM Decision" : "SAP QM Release"}
            active={selectedNodeId === 'QM_DECISION'}
            hasData={!!nodesData['QM_DECISION']}
            onClick={setSelectedNodeId}
          />
          <ArrowRight />
          <NodeCard
            id="ERP_PERFORMANCE"
            title={perspective === 'simple' ? "9. Close Order" : "9. ERP Settlement"}
            subtitle={perspective === 'simple' ? "SAP Cost Settlement" : "B2MML Yield Report"}
            active={selectedNodeId === 'ERP_PERFORMANCE'}
            hasData={!!nodesData['ERP_PERFORMANCE']}
            onClick={setSelectedNodeId}
          />

        </div>

        {/* Explanation Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid var(--surface-border)',
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.4'
        }}>
          💡 <strong>How Data Flows</strong>: An order released at <strong>Level 4</strong> stages inventory from EWM. The <strong>Level 3</strong> MES reads this configuration and coordinates the <strong>Level 1/2</strong> machines. Machine statuses feed continuous telemetry to SCADA, which logs timestamps back to the <strong>EBR</strong> database. Finished material triggers a <strong>LIMS</strong> quality lot sample, settling final yields back into <strong>ERP</strong>.
        </div>
      </div>

      {/* ── Right Pane: Live Data & Metadata Inspector ── */}
      <div className="glass-panel" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {selectedNode && (
          <>
            <div style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--accent-cyan)' }}>
                {selectedNode.level}
              </span>
              <h2 style={{ fontSize: '0.95rem', margin: '6px 0 2px 0' }}>
                {perspective === 'simple' ? selectedNode.simpleTitle : selectedNode.title}
              </h2>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                Protocol: {selectedNode.protocol}
              </span>
            </div>

            <p style={{ fontSize: '0.7rem', lineHeight: '1.4', margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>
              {perspective === 'simple' ? selectedNode.simpleDescription : selectedNode.description}
            </p>

            <h3 style={{ fontSize: '0.7rem', marginBottom: '8px' }}>
              📡 Latest Payload Stream
            </h3>

            {selectedMsg ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span><strong>Timestamp:</strong> {new Date(selectedMsg.timestamp).toLocaleTimeString()}</span>
                  {selectedMsg.topic && <span><strong>Topic:</strong> {selectedMsg.topic}</span>}
                </div>
                <pre style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--surface-border)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontSize: '0.65rem',
                  color: 'var(--text-primary)',
                  overflow: 'auto',
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {typeof selectedMsg.payload === 'string'
                    ? selectedMsg.payload
                    : JSON.stringify(selectedMsg.payload, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{
                flex: 1,
                border: '1px dashed var(--surface-border)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '24px',
                color: 'var(--text-muted)',
                fontSize: '0.7rem'
              }}>
                <div>
                  💤 No live payloads captured yet.<br />
                  Start the simulation and complete steps to stream actual data here.
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

function NodeCard({ id, title, subtitle, active, hasData, onClick }) {
  return (
    <div
      onClick={() => onClick(id)}
      style={{
        flex: 1,
        background: active ? 'rgba(0, 255, 204, 0.05)' : 'var(--bg-tertiary)',
        border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--surface-border)'}`,
        borderRadius: '6px',
        padding: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: active ? '0 0 10px rgba(0, 255, 204, 0.15)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: hasData ? 'var(--accent-green)' : '#444',
          boxShadow: hasData ? '0 0 6px var(--accent-green)' : 'none'
        }} title={hasData ? 'Data streaming active' : 'Waiting for data'}></span>
      </div>
      <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{subtitle}</span>
    </div>
  );
}
