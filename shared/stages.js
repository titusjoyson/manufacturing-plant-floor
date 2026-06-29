/**
 * stages.js — 9 Manufacturing Stages of the Zoladex Production Line
 * Each stage defines its process parameters, nominal setpoints, sensor tags, and timing.
 */

export const STAGES = {
  SOLUTION_PREP: {
    id: 'SOLUTION_PREP',
    index: 0,
    name: 'Solution Preparation & Filtration',
    shortName: 'Solution Prep',
    description: 'PLGA polymer and goserelin API dissolved in glacial acetic acid, then sterile filtered',
    nominalDuration: 45 * 60, // seconds (45 min)
    setpoints: {
      targetConcentration: 0.15,     // g/mL
      dissolutionRateConstant: 0.002, // k (1/s)
      filterMembraneResistance: 1.2e10, // R (1/m)
      filterArea: 0.05,              // m²
      pumpFlowRate: 2.5,             // L/min
      targetPH: 2.8,
    },
    sensorTags: ['TT-101', 'FT-101', 'PT-101', 'AT-101', 'PC-101'],
    limits: {
      'TT-101': { lo: 15, loLo: 10, hi: 30, hiHi: 35, unit: '°C', name: 'Solution Temperature' },
      'FT-101': { lo: 1.5, loLo: 1.0, hi: 3.5, hiHi: 4.0, unit: 'L/min', name: 'Flow Rate' },
      'PT-101': { lo: 0.5, loLo: 0.2, hi: 2.0, hiHi: 2.5, unit: 'bar', name: 'Pump Pressure' },
      'AT-101': { lo: 2.5, loLo: 2.0, hi: 3.2, hiHi: 3.5, unit: 'pH', name: 'Solution pH' },
      'PC-101': { lo: 0, loLo: 0, hi: 3520, hiHi: 5000, unit: 'particles/m³', name: 'Particle Count 0.5µm' },
    },
  },

  DRUM_FREEZING: {
    id: 'DRUM_FREEZING',
    index: 1,
    name: 'Drum Freezing',
    shortName: 'Drum Freeze',
    description: 'Cryogenic rotating drum flash-freezes solution into flakes',
    nominalDuration: 60 * 60, // 60 min
    setpoints: {
      drumTemperature: -60,       // °C
      drumRPM: 12,                // RPM
      feedRate: 0.8,              // L/min
      heatTransferCoeff: 150,     // W/(m²·K)
      drumSurfaceArea: 2.5,       // m²
      solutionCp: 2100,           // J/(kg·K)
      glassTransitionTemp: -45,   // °C
    },
    sensorTags: ['TT-201', 'ST-201', 'FT-201', 'VT-201'],
    limits: {
      'TT-201': { lo: -70, loLo: -80, hi: -50, hiHi: -40, unit: '°C', name: 'Drum Surface Temp' },
      'ST-201': { lo: 8, loLo: 5, hi: 16, hiHi: 20, unit: 'RPM', name: 'Drum Speed' },
      'FT-201': { lo: 0.4, loLo: 0.2, hi: 1.2, hiHi: 1.5, unit: 'L/min', name: 'Feed Rate' },
      'VT-201': { lo: 0, loLo: 0, hi: 0.8, hiHi: 1.5, unit: 'mm/s RMS', name: 'Vibration' },
    },
  },

  LYOPHILIZATION: {
    id: 'LYOPHILIZATION',
    index: 2,
    name: 'Lyophilization (Freeze Drying)',
    shortName: 'Lyophilization',
    description: '24hr freeze-drying cycle: sublimation of acetic acid under vacuum',
    nominalDuration: 24 * 60 * 60, // 24 hours
    setpoints: {
      chamberPressure: 100,       // mTorr
      condenserTemp: -50,         // °C
      shelfTempInitial: -40,      // °C
      shelfTempFinal: 25,         // °C
      sublimationResistance: 5e4, // s/m
      targetMoisture: 0.5,        // % w/w
    },
    sensorTags: ['PT-301', 'TT-301', 'TT-302', 'MT-301'],
    limits: {
      'PT-301': { lo: 50, loLo: 20, hi: 200, hiHi: 500, unit: 'mTorr', name: 'Chamber Vacuum' },
      'TT-301': { lo: -60, loLo: -70, hi: -40, hiHi: -30, unit: '°C', name: 'Condenser Temp' },
      'TT-302': { lo: -45, loLo: -50, hi: 30, hiHi: 35, unit: '°C', name: 'Shelf Temp' },
      'MT-301': { lo: 0, loLo: 0, hi: 1.0, hiHi: 1.5, unit: 'kg/hr', name: 'Sublimation Rate' },
    },
  },

  EQUILIBRATION: {
    id: 'EQUILIBRATION',
    index: 3,
    name: 'Equilibration',
    shortName: 'Equilibration',
    description: 'Thermal and moisture equilibration under Grade A laminar flow',
    nominalDuration: 120 * 60, // 120 min
    setpoints: {
      ambientTemp: 22,            // °C
      targetHumidity: 45,         // % RH
      thermalTimeConstant: 1800,  // seconds (τ)
      equilibriumMoisture: 1.5,   // % w/w
    },
    sensorTags: ['TT-401', 'HT-401', 'TT-402'],
    limits: {
      'TT-401': { lo: 20, loLo: 18, hi: 24, hiHi: 26, unit: '°C', name: 'Ambient Temp' },
      'HT-401': { lo: 30, loLo: 20, hi: 65, hiHi: 75, unit: '%RH', name: 'Relative Humidity' },
      'TT-402': { lo: -10, loLo: -20, hi: 26, hiHi: 30, unit: '°C', name: 'Material Temp' },
    },
  },

  COMPACTION: {
    id: 'COMPACTION',
    index: 4,
    name: 'Compaction',
    shortName: 'Compaction',
    description: 'High-pressure piston compaction of lyophilized powder into dense cylinders',
    nominalDuration: 30 * 60, // 30 min
    setpoints: {
      pistonPressure: 150,        // bar
      pistonStroke: 80,           // mm
      heckelK: 0.008,             // Heckel constant (1/bar)
      heckelA: 0.5,               // Heckel intercept
      targetDensity: 0.85,        // relative density (0-1)
    },
    sensorTags: ['PT-501', 'DT-501', 'LT-501'],
    limits: {
      'PT-501': { lo: 100, loLo: 80, hi: 200, hiHi: 250, unit: 'bar', name: 'Piston Pressure' },
      'DT-501': { lo: 60, loLo: 50, hi: 100, hiHi: 110, unit: 'mm', name: 'Displacement' },
      'LT-501': { lo: 8, loLo: 5, hi: 16, hiHi: 20, unit: 'kN', name: 'Load Cell Force' },
    },
  },

  MELT_EXTRUSION: {
    id: 'MELT_EXTRUSION',
    index: 5,
    name: 'Aseptic Melt Extrusion',
    shortName: 'Extrusion',
    description: 'Heated multi-zone barrel extrusion of PLGA polymer strand with embedded API',
    nominalDuration: 90 * 60, // 90 min
    setpoints: {
      zone1Temp: 60,              // °C
      zone2Temp: 65,              // °C
      zone3Temp: 70,              // °C
      screwRPM: 30,               // RPM
      targetTorque: 18,           // N·m
      diePressure: 45,            // bar
      powerLawK: 12000,           // Pa·s^n (consistency index)
      powerLawN: 0.4,             // flow behavior index (shear-thinning)
      degradationActivationEnergy: 80000, // J/mol (Arrhenius Ea)
      degradationPreExponential: 1e8,     // 1/s (Arrhenius A)
      degradationTempThreshold: 75,       // °C — above this, degradation accelerates
      targetStrandDiameter: 1.5,  // mm
    },
    sensorTags: ['TT-601', 'TT-602', 'TT-603', 'TQ-601', 'PT-601', 'VS-601'],
    limits: {
      'TT-601': { lo: 50, loLo: 40, hi: 75, hiHi: 80, unit: '°C', name: 'Zone 1 Barrel Temp' },
      'TT-602': { lo: 55, loLo: 45, hi: 78, hiHi: 83, unit: '°C', name: 'Zone 2 Barrel Temp' },
      'TT-603': { lo: 60, loLo: 50, hi: 80, hiHi: 85, unit: '°C', name: 'Zone 3 Barrel Temp' },
      'TQ-601': { lo: 10, loLo: 5, hi: 25, hiHi: 30, unit: 'N·m', name: 'Screw Torque' },
      'PT-601': { lo: 30, loLo: 20, hi: 60, hiHi: 70, unit: 'bar', name: 'Die Pressure' },
      'VS-601': { lo: 0, loLo: 0, hi: 900, hiHi: 1000, unit: 'Pa·s', name: 'Melt Viscosity' },
    },
  },

  CUTTING: {
    id: 'CUTTING',
    index: 6,
    name: 'Cutting & Visual Inspection',
    shortName: 'Cutting',
    description: 'Precision cutting of extruded strand into 1-1.5mm depots with vision system QC',
    nominalDuration: 60 * 60, // 60 min
    setpoints: {
      bladeFrequency: 200,        // cuts/min
      targetDepotLength: 1.0,     // mm
      lengthTolerance: 0.1,       // mm
      diameterTolerance: 0.05,    // mm
      visionPassRate: 0.985,      // 98.5% nominal
      microStoppageRate: 0.2,     // events/hr base rate
    },
    sensorTags: ['BV-701', 'DC-701', 'MS-701'],
    limits: {
      'BV-701': { lo: 150, loLo: 100, hi: 250, hiHi: 300, unit: 'cuts/min', name: 'Blade Velocity' },
      'DC-701': { lo: 95, loLo: 90, hi: 100, hiHi: 100, unit: '%', name: 'Dimensional Conformity' },
      'MS-701': { lo: 0, loLo: 0, hi: 0.5, hiHi: 1.0, unit: 'events/hr', name: 'Micro-Stoppages' },
    },
  },

  CHECKWEIGHING: {
    id: 'CHECKWEIGHING',
    index: 7,
    name: 'Checkweighing',
    shortName: 'Checkweigh',
    description: '100% automated depot weighing with SPC statistical process control',
    nominalDuration: 60 * 60, // 60 min
    setpoints: {
      targetMass: 3.6,            // mg
      massTolerance: 0.05,        // mg
      massStdDev: 0.015,          // mg nominal σ
      spcControlLimitSigma: 3,    // ±3σ for control limits
      spcRunLength: 7,            // consecutive points for run rule
    },
    sensorTags: ['WT-801', 'AR-801', 'SP-801'],
    limits: {
      'WT-801': { lo: 3.4, loLo: 3.3, hi: 3.8, hiHi: 3.9, unit: 'mg', name: 'Depot Mass' },
      'AR-801': { lo: 0, loLo: 0, hi: 5, hiHi: 10, unit: '%', name: 'Reject Rate' },
      'SP-801': { lo: -3, loLo: -3, hi: 3, hiHi: 3, unit: 'σ', name: 'SPC Deviation' },
    },
  },

  PACKAGING: {
    id: 'PACKAGING',
    index: 8,
    name: 'Primary Packaging (Syringe Assembly)',
    shortName: 'Packaging',
    description: 'Depot insertion into pre-sterilized syringes, labeling, and foil pouch sealing',
    nominalDuration: 45 * 60, // 45 min
    setpoints: {
      lineCapacity: 50,           // units/min
      capTorqueTarget: 0.8,       // N·m
      capTorqueStdDev: 0.05,      // N·m
      labelPassRate: 0.999,       // 99.9%
    },
    sensorTags: ['TP-901', 'CT-901', 'LV-901'],
    limits: {
      'TP-901': { lo: 30, loLo: 20, hi: 60, hiHi: 70, unit: 'units/min', name: 'Throughput' },
      'CT-901': { lo: 0.5, loLo: 0.3, hi: 1.1, hiHi: 1.3, unit: 'N·m', name: 'Cap Torque' },
      'LV-901': { lo: 95, loLo: 90, hi: 100, hiHi: 100, unit: '%', name: 'Label Verification' },
    },
  },
};

/** Ordered array of stage IDs for sequential iteration */
export const STAGE_ORDER = [
  'SOLUTION_PREP',
  'DRUM_FREEZING',
  'LYOPHILIZATION',
  'EQUILIBRATION',
  'COMPACTION',
  'MELT_EXTRUSION',
  'CUTTING',
  'CHECKWEIGHING',
  'PACKAGING',
];

/** Get stage by index (0-8) */
export function getStageByIndex(index) {
  return STAGES[STAGE_ORDER[index]] || null;
}

/** Total number of stages */
export const STAGE_COUNT = STAGE_ORDER.length;
