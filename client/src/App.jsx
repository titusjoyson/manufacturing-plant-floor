/**
 * App.jsx — Main Application Shell
 * Assembles the 3D plant floor, sidebar panels, header, and HUD.
 */

import { useState } from 'react';
import { useSimulation } from './hooks/useSimulation';
import PlantFloorScene from './components/PlantFloorScene';
import StageInspector from './components/StageInspector';
import MessageConsole from './components/MessageConsole';
import AlarmBanner from './components/AlarmBanner';
import CampaignTimeline from './components/CampaignTimeline';
import ControlPanel from './components/ControlPanel';
import HumanOperations from './components/HumanOperations';
import EnvironmentMonitor from './components/EnvironmentMonitor';

import DataRelationsDashboard from './components/DataRelationsDashboard';
import DatabaseExplorer from './components/DatabaseExplorer';

export default function App() {
  const sim = useSimulation();
  const [selectedStage, setSelectedStage] = useState(() => {
    return localStorage.getItem('spp5_selectedStage') || null;
  });
  const [sidebarTab, setSidebarTab] = useState(() => {
    return localStorage.getItem('spp5_sidebarTab') || 'control';
  });
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('spp5_viewMode') || '3d';
  });
  const [showGlossary, setShowGlossary] = useState(false);

  const handleSelectStage = (stageId) => {
    setSelectedStage(stageId);
    if (stageId) {
      localStorage.setItem('spp5_selectedStage', stageId);
    } else {
      localStorage.removeItem('spp5_selectedStage');
    }
  };

  const handleSetSidebarTab = (tabId) => {
    setSidebarTab(tabId);
    localStorage.setItem('spp5_sidebarTab', tabId);
  };

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('spp5_viewMode', mode);
  };

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <span className="app-header__logo">◆ ZOLADEX SIMULATOR</span>
            <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block' }}>
              Macclesfield SPP5 • PLGA Extrusion Line
            </span>
          </div>
          <button 
            className="btn btn--sm" 
            style={{ 
              padding: '4px 8px', 
              fontSize: '0.6rem', 
              border: '1px solid var(--surface-border)', 
              background: 'var(--bg-tertiary)',
              cursor: 'pointer'
            }}
            onClick={() => setShowGlossary(true)}
          >
            ℹ Glossary
          </button>
        </div>

        {/* View Toggles in Header Center */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
          <button 
            className={`btn btn--sm ${viewMode === '3d' ? 'btn--primary' : ''}`}
            style={{ padding: '4px 12px', fontSize: '0.65rem', border: 'none' }}
            onClick={() => handleSetViewMode('3d')}
          >
            🌐 3D Floor Plan
          </button>
          <button 
            className={`btn btn--sm ${viewMode === 'relations' ? 'btn--primary' : ''}`}
            style={{ padding: '4px 12px', fontSize: '0.65rem', border: 'none' }}
            onClick={() => handleSetViewMode('relations')}
          >
            📊 Data Relations
          </button>
          <button 
            className={`btn btn--sm ${viewMode === 'database' ? 'btn--primary' : ''}`}
            style={{ padding: '4px 12px', fontSize: '0.65rem', border: 'none' }}
            onClick={() => handleSetViewMode('database')}
          >
            🗄 Database Explorer
          </button>
        </div>

        <div className="app-header__right">
          {/* Sim Clock */}
          <div style={{ textAlign: 'right' }}>
            <div className="clock-display__label">SIM TIME</div>
            <div className="clock-display">
              {sim.clock?.formattedTime || '00:00:00'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="clock-display__label">SPEED</div>
            <div className="mono" style={{ color: 'var(--accent-amber)', fontSize: '1rem' }}>
              {sim.clock?.timeScale || 50}×
            </div>
          </div>
        </div>
      </header>

      {/* ── Main View ── */}
      <main className="app-main">
        {viewMode === '3d' ? (
          <PlantFloorScene
            equipment={sim.equipment}
            campaign={sim.campaign}
            onSelectStage={handleSelectStage}
          />
        ) : viewMode === 'relations' ? (
          <DataRelationsDashboard messages={sim.messages} />
        ) : (
          <DatabaseExplorer />
        )}

        {/* HUD Overlay (Only visible in 3D mode) */}
        {viewMode === '3d' && (
          <div className="hud-overlay">
            {/* Stage Timeline */}
            <div className="hud-bottom-center">
              <div className="glass-panel" style={{ padding: '4px 8px', minWidth: '600px' }}>
                <CampaignTimeline campaign={sim.campaign} />
              </div>
            </div>

            {/* Active alarms */}
            <div className="hud-top-right" style={{ maxWidth: '350px' }}>
              <AlarmBanner alarms={sim.alarms} onAcknowledge={sim.acknowledgeAlarm} />
            </div>

            {/* Batch info */}
            {sim.campaign?.phase === 'BATCH_RUNNING' && (
              <div className="hud-top-left">
                <div className="glass-panel" style={{ padding: '12px 16px' }}>
                  <div className="clock-display__label">ACTIVE BATCH</div>
                  <div className="mono" style={{ color: 'var(--accent-green)', fontSize: '1rem' }}>
                    {sim.campaign?.currentBatch}/{sim.campaign?.totalBatches}
                  </div>
                  <div className="clock-display__label" style={{ marginTop: '6px' }}>
                    {sim.campaign?.currentStageName || 'Initializing...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--surface-border)',
          background: 'var(--bg-tertiary)',
        }}>
          {[
            { id: 'control', label: '⚙ Control' },
            { id: 'inspect', label: '🔍 Inspect' },
            { id: 'humans', label: '👤 Humans' },
            { id: 'messages', label: '📡 IT/OT/ET Data' },
          ].map(tab => (
            <button
              key={tab.id}
              className="btn btn--sm"
              style={{
                flex: 1,
                borderRadius: 0,
                border: 'none',
                borderBottom: sidebarTab === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                background: sidebarTab === tab.id ? 'var(--bg-glass)' : 'transparent',
                fontSize: '0.65rem',
                padding: '8px 4px',
              }}
              onClick={() => handleSetSidebarTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sidebarTab === 'control' && (
            <>
              <ControlPanel
                campaign={sim.campaign}
                clock={sim.clock}
                connected={sim.connected}
                onStart={sim.startCampaign}
                onPause={sim.pause}
                onResume={sim.resume}
                onSetSpeed={sim.setSpeed}
                onInjectFault={sim.injectFault}
              />
              <EnvironmentMonitor equipment={sim.equipment} />
            </>
          )}

          {sidebarTab === 'inspect' && (
            <StageInspector
              stageId={selectedStage || sim.campaign?.currentStage}
              equipment={sim.equipment}
              materialBatch={sim.materialBatch}
            />
          )}

          {sidebarTab === 'humans' && (
            <HumanOperations
              ebrSteps={sim.ebrSteps}
              humanActions={sim.humanActions}
            />
          )}

          {sidebarTab === 'messages' && (
            <MessageConsole messages={sim.messages} />
          )}
        </div>
      </aside>

      {/* Glossary Modal Overlay */}
      {showGlossary && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 17, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '550px',
            width: '100%',
            padding: '24px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.0rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <span>📖 Manufacturing Glossary & Acronyms</span>
              </h2>
              <button 
                className="btn btn--sm" 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', padding: '4px 10px' }}
                onClick={() => setShowGlossary(false)}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.7rem', lineHeight: '1.4' }}>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>ERP (Enterprise Resource Planning - SAP)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>The high-level planning brain. Schedules master orders (B2MML requests), tracks raw inventory costs, and settles final production accounts.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>MES (Manufacturing Execution System - Werum PAS-X)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>The operational director on the plant floor. Takes order requests and coordinates human operators, barcode scanning, recipes, and e-signatures.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>SCADA (Supervisory Control & Data Acquisition)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>Tracks physical process automation. Gathers real-time machine readings, triggers temperature/pressure alarms, and signals equipment starts/stops.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>EBR (Electronic Batch Record)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>A secure digital compliance ledger. Automatically captures safety parameters, sanitization clearances, and operator badge signatures to verify clinical compliance.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>LIMS (Laboratory Information Management System - LabWare)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>The laboratory test manager. Evaluates samples of finished drugs for active potency, dissolution rates, and sterility before batch release.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>EWM (Extended Warehouse Management - SAP EWM)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>Stages and prepares chemical ingredients and syringe parts from warehouse shelves to shop floor loading bays.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>B2MML (Business to Manufacturing Markup Language)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>Standard XML vocabulary based on the ISA-95 standard. It translates planning orders from ERP systems into language that execution systems (MES) understand.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>PackML (Packaging Machine Language)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>Standardized equipment state machine (Idle, Starting, Execute, Holding, Held, Completing, Complete) used to align multi-vendor machine lines.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-cyan)' }}>UNS (Unified Namespace)</strong>
                <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>A centralized MQTT/OPC UA network broker where machines publish live telemetry for consumption by corporate analytics software.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
