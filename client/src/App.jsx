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

export default function App() {
  const sim = useSimulation();
  const [selectedStage, setSelectedStage] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('control');

  return (
    <div className="app-layout">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__left">
          <span className="app-header__logo">◆ ZOLADEX SIMULATOR</span>
          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
            Macclesfield SPP5 • PLGA Extrusion Line
          </span>
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

      {/* ── Main 3D View ── */}
      <main className="app-main">
        <PlantFloorScene
          equipment={sim.equipment}
          campaign={sim.campaign}
          onSelectStage={setSelectedStage}
        />

        {/* HUD Overlay */}
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
            { id: 'messages', label: '📡 Messages' },
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
              onClick={() => setSidebarTab(tab.id)}
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
    </div>
  );
}
