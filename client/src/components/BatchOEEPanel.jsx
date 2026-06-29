/**
 * BatchOEEPanel.jsx — Real-Time OEE for Batches (OBE) Dashboard
 * Computes and visualizes Availability, Performance, and Quality metrics
 * based on the chemical-physical simulation state.
 */

import { useMemo } from 'react';

export default function BatchOEEPanel({ campaign, clock, alarms }) {
  const stats = useMemo(() => {
    if (!campaign) {
      return { oee: 0, availability: 100, performance: 100, quality: 100, downtime: 0, totalProcessed: 0, packaged: 0, rejected: 0 };
    }

    // 1. Availability Calculation (Planned Production Time vs Unplanned Downtime)
    const totalElapsed = campaign.totalElapsed || 1;
    
    // Sum downtime from all historical alarms (cleared or active)
    const totalDowntime = (alarms || []).reduce((acc, alarm) => {
      const end = alarm.clearedAt || clock?.simTime || totalElapsed;
      const start = alarm.raisedAt || 0;
      const duration = Math.max(0, end - start);
      return acc + duration;
    }, 0);

    // Limit downtime to total elapsed to avoid division overflow
    const boundedDowntime = Math.min(totalElapsed, totalDowntime);
    const availability = totalElapsed > 0 
      ? ((totalElapsed - boundedDowntime) / totalElapsed) * 100 
      : 100;

    // 2. Performance Calculation (Actual Depots Produced vs Design Rate Throughput)
    // Design rate: 50 depots per minute (~0.833 depots per second) during BATCH_RUNNING phase
    let runningTime = totalElapsed;
    // Simple estimation of active execution time: total elapsed minus downtime
    const runTime = Math.max(1, runningTime - boundedDowntime);
    const designRate = 50 / 60; // depots/sec
    const expectedDepots = runTime * designRate;

    // Calculate actual depots cut
    const allBatches = campaign.batches || [];
    const activeBatch = campaign.activeBatch;
    
    const actualDepots = allBatches.reduce((acc, b) => acc + (b.totalDepots || 0), 0) + 
                         (activeBatch?.totalDepots || 0);

    const performance = expectedDepots > 0
      ? Math.min(100, Math.max(20, (actualDepots / expectedDepots) * 100))
      : 100;

    // 3. Quality Calculation (First Pass Yield: Packaged Syringes vs Total Processed Depots)
    const packaged = allBatches.reduce((acc, b) => acc + (b.packagedCount || 0), 0) + 
                     (activeBatch?.packagedCount || 0);
    
    const cutRejects = allBatches.reduce((acc, b) => acc + (b.visionRejected || 0), 0) + 
                       (activeBatch?.visionRejected || 0);

    const weighRejects = allBatches.reduce((acc, b) => acc + (b.weightRejected || 0), 0) + 
                         (activeBatch?.weightRejected || 0);

    const labelRejects = allBatches.reduce((acc, b) => acc + (b.labelFailed || 0), 0) + 
                        (activeBatch?.labelFailed || 0);

    const totalRejects = cutRejects + weighRejects + labelRejects;
    const totalProcessed = packaged + totalRejects;

    const quality = totalProcessed > 0
      ? (packaged / totalProcessed) * 100
      : 100;

    // 4. Overall OEE Synthesis
    const oee = (availability * performance * quality) / 10000;

    return {
      oee: parseFloat(oee.toFixed(1)),
      availability: parseFloat(availability.toFixed(1)),
      performance: parseFloat(performance.toFixed(1)),
      quality: parseFloat(quality.toFixed(1)),
      downtime: parseFloat(boundedDowntime.toFixed(0)),
      totalProcessed,
      packaged,
      rejected: totalRejects,
      cutRejects,
      weighRejects,
      labelRejects
    };
  }, [campaign, clock, alarms]);

  const oeeColor = stats.oee >= 75 ? 'var(--accent-green)' : 
                   stats.oee >= 60 ? 'var(--accent-cyan)' : 
                   stats.oee >= 40 ? 'var(--accent-amber)' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
      
      {/* OEE Radial/Progress Circle */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Batch OEE (Overall Effectiveness)
        </div>
        
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: `6px double ${oeeColor}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 15px ${oeeColor}1a`,
          margin: '12px 0'
        }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {stats.oee}%
          </span>
          <span style={{ fontSize: '0.5rem', color: oeeColor, fontWeight: 700 }}>
            {stats.oee >= 75 ? '🏆 WORLD CLASS' : stats.oee >= 60 ? '⚡ OPTIMIZED' : '⚠️ UNDERPERFORMING'}
          </span>
        </div>

        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '280px', lineHeight: '1.4' }}>
          Real-time metrics calculated using pharmaceutical **OBE** (OEE for Batches) methodology.
        </div>
      </div>

      {/* OEE Tri-Factors */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        
        {/* Availability */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>⏱ Availability (Uptime)</span>
            <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{stats.availability}%</span>
          </div>
          <div className="progress-bar" style={{ height: '6px' }}>
            <div className="progress-bar__fill" style={{ width: `${stats.availability}%`, background: 'var(--accent-cyan)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            <span>Elapsed: {(campaign?.totalElapsed / 60 || 0).toFixed(1)}m</span>
            <span>Downtime: {(stats.downtime / 60).toFixed(1)}m</span>
          </div>
        </div>

        {/* Performance */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>⚡ Performance (Throughput)</span>
            <span className="mono" style={{ color: 'var(--accent-amber)' }}>{stats.performance}%</span>
          </div>
          <div className="progress-bar" style={{ height: '6px' }}>
            <div className="progress-bar__fill" style={{ width: `${stats.performance}%`, background: 'var(--accent-amber)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            <span>Target: 50 depots/min</span>
            <span>Actual Yield: {stats.packaged} EA</span>
          </div>
        </div>

        {/* Quality */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>🧪 Quality (First Pass Yield)</span>
            <span className="mono" style={{ color: 'var(--accent-green)' }}>{stats.quality}%</span>
          </div>
          <div className="progress-bar" style={{ height: '6px' }}>
            <div className="progress-bar__fill" style={{ width: `${stats.quality}%`, background: 'var(--accent-green)' }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            <span>Packaged: {stats.packaged}</span>
            <span>Rejects: {stats.rejected}</span>
          </div>
        </div>

      </div>

      {/* Yield & Loss Analysis */}
      <div className="glass-panel" style={{ padding: '12px' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
          Quality Loss Breakdown
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>
            <span className="text-muted">📐 Cutter Dimensions Rejects</span>
            <span className="mono" style={{ color: stats.cutRejects > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{stats.cutRejects} EA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '3px' }}>
            <span className="text-muted">⚖️ Checkweigh Weight Rejects</span>
            <span className="mono" style={{ color: stats.weighRejects > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{stats.weighRejects} EA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '3px' }}>
            <span className="text-muted">🏷️ Packaging Label Rejects</span>
            <span className="mono" style={{ color: stats.labelRejects > 0 ? '#ef4444' : 'var(--text-secondary)' }}>{stats.labelRejects} EA</span>
          </div>
        </div>
      </div>

    </div>
  );
}
