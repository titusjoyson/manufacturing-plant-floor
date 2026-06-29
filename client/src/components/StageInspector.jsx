/**
 * StageInspector.jsx — Detailed view of a selected manufacturing stage.
 * Shows sensor readings, equipment state, and material properties.
 */

import { STAGES } from '@shared/stages.js';

const LAYMAN_EXPLANATIONS = {
  SOLUTION_PREP: {
    what: "Dissolving raw drug powder and PLGA polymer in a solvent to make a uniform liquid solution.",
    why: "Mixing at the correct concentration ensures the finished syringe has the precise target dose of drug ingredients.",
    stake: "If temperature is out of bounds, the drug molecules won't dissolve properly or could begin to degrade."
  },
  DRUM_FREEZING: {
    what: "Pouring the dissolved solution onto a cryogenic rotating drum cooled to -60°C to freeze it into solid thin flakes instantly.",
    why: "Rapid freezing prevents the drug particles from separating out of the polymer mixture.",
    stake: "If the drum isn't cold enough, the freezing will be slow, causing uneven drug distribution throughout the batch."
  },
  LYOPHILIZATION: {
    what: "Freeze-drying the frozen flakes under a deep vacuum to evaporate (sublime) the solid solvent direct to gas without melting.",
    why: "This removes the chemical solvent completely, leaving a sterile, dry powder cake ready for physical shaping.",
    stake: "Lyophilization takes a long time. If the vacuum pressure fails or breaks, the solvent melts the powder, ruining the structural integrity."
  },
  EQUILIBRATION: {
    what: "Letting the dry drug-polymer powder absorb a tiny amount of moisture from a humidity-controlled cleanroom drawer.",
    why: "A small amount of moisture relaxes the dry polymer chains, making them flexible so they compress without cracking.",
    stake: "Too much moisture ruins the drug stability; too little moisture leaves the polymer brittle, making compaction crack."
  },
  COMPACTION: {
    what: "Compressing the relaxed polymer powder under massive piston load into dense, solid drug cylinders.",
    why: "Compacting removes air pockets, preparing the polymer to be extruded smoothly into micro-thin syringe filaments.",
    stake: "Under-compressing leaves air bubbles that cause thin spots; over-compressing strains the barrel mold."
  },
  MELT_EXTRUSION: {
    what: "Feeding the solid cylinders into a heated extruder screw zone (60-70°C) and pushing it through a micro-orifice die.",
    why: "This shapes the drug into the final 1mm thick, slow-release implant depot that is placed inside the syringes.",
    stake: "Heat is required to soften the polymer, but high temperatures trigger Arrhenius thermal degradation, destroying the active drug."
  },
  CUTTING: {
    what: "Slicing the extruded continuous filament with a high-speed rotating blade into precision 1mm - 1.5mm depot lengths.",
    why: "Each sliced depot corresponds to one individual patient dose of Zoladex.",
    stake: "The blade speed and filament feed speed must be synchronized. A lag results in depots being too long or too short."
  },
  CHECKWEIGHING: {
    what: "Weighing 100% of the sliced depots on a high-speed, micro-gram scale.",
    why: "Validates that every single depot is exactly within the tight weight specifications (nominally 3.6mg ± 10%).",
    stake: "Depots outside the statistical control chart limits are immediately blown into a reject bin to protect patients."
  },
  PACKAGING: {
    what: "Loading the passed depots into syringes, sealing them in foil pouches with desiccant, and printing barcode labels.",
    why: "Protects the drug from humidity, dust, and contamination until it is administered in the clinic.",
    stake: "A poor heat seal allows moisture in, which degrades the PLGA polymer and shortens product shelf-life."
  }
};

export default function StageInspector({ stageId, equipment, materialBatch }) {
  if (!stageId) {
    return (
      <div className="panel-section" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <p className="text-muted" style={{ fontSize: '0.8rem' }}>
          Click a machine in the 3D view to inspect
        </p>
      </div>
    );
  }

  const stage = STAGES[stageId];
  const equip = equipment?.[stageId];
  if (!stage) return null;

  const sensors = equip?.sensors || {};
  const state = equip?.state || 'Unknown';
  const layman = LAYMAN_EXPLANATIONS[stageId];

  const stateColor = state === 'Execute' ? 'var(--accent-green)' :
    state === 'Idle' ? 'var(--accent-cyan)' :
    state === 'Held' ? 'var(--accent-amber)' : 'var(--text-muted)';

  return (
    <div className="panel-section">
      <div className="panel-section__header">
        <h3>Stage Inspector</h3>
        <span className="badge badge--running" style={{ background: `${stateColor}22`, color: stateColor }}>
          <span className="badge__dot" style={{ background: stateColor }}></span>
          {state}
        </span>
      </div>

      <h2 style={{ marginBottom: '4px', fontSize: '0.95rem' }}>{stage.shortName}</h2>
      <p className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '12px' }}>{stage.description}</p>

      {/* Layman Explainer Panel */}
      {layman && (
        <div style={{
          marginTop: '8px',
          marginBottom: '14px',
          padding: '10px 12px',
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '6px',
          fontSize: '0.68rem',
          lineHeight: '1.4',
        }}>
          <div style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span>💡 Plain English Explainer</span>
          </div>
          <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
            {layman.what}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            <strong>Why it matters:</strong> {layman.why}
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
            ⚠️ <strong>Process Stakes:</strong> {layman.stake}
          </div>
        </div>
      )}

      {/* Sensor Readings */}
      <div style={{ marginBottom: '16px' }}>
        {Object.entries(sensors).map(([tagId, sensor]) => {
          const qualityClass = sensor.quality === 'Good' ? 'good' :
            sensor.quality === 'Uncertain' ? 'uncertain' : 'bad';

          return (
            <div key={tagId} className="sensor-reading">
              <div>
                <span className="sensor-reading__label">{sensor.name}</span>
                <span className="text-muted" style={{ fontSize: '0.6rem', marginLeft: '6px' }}>
                  {tagId}
                </span>
              </div>
              <span className={`sensor-reading__value sensor-reading__value--${qualityClass}`}>
                {typeof sensor.value === 'number' ? sensor.value.toFixed(2) : sensor.value}
                <span className="text-muted" style={{ fontSize: '0.6rem', marginLeft: '3px' }}>
                  {sensor.unit}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Material Batch Properties */}
      {materialBatch && (
        <div>
          <h3 style={{ marginBottom: '8px' }}>Material Batch</h3>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Mass</span>
            <span className="sensor-reading__value mono">{materialBatch.mass?.toFixed(2)} kg</span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">API Potency</span>
            <span className={`sensor-reading__value mono ${materialBatch.apiPotency < 95 ? 'sensor-reading__value--uncertain' : 'sensor-reading__value--good'}`}>
              {materialBatch.apiPotency?.toFixed(1)}%
            </span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Temperature</span>
            <span className="sensor-reading__value mono">{materialBatch.temperature?.toFixed(1)} °C</span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Density</span>
            <span className="sensor-reading__value mono">{materialBatch.density?.toFixed(3)}</span>
          </div>
          <div className="sensor-reading">
            <span className="sensor-reading__label">Packaged</span>
            <span className="sensor-reading__value mono">{materialBatch.packagedCount || 0} units</span>
          </div>
        </div>
      )}
    </div>
  );
}
