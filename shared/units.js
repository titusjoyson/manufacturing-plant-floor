/**
 * units.js — Engineering Unit Definitions
 * Standard units used across the simulator for OPC UA, Sparkplug B, and display.
 */

export const UNITS = {
  CELSIUS: { symbol: '°C', name: 'Degrees Celsius', type: 'temperature' },
  BAR: { symbol: 'bar', name: 'Bar', type: 'pressure' },
  MTORR: { symbol: 'mTorr', name: 'Millitorr', type: 'pressure' },
  LITERS_PER_MIN: { symbol: 'L/min', name: 'Liters per Minute', type: 'flowrate' },
  KG_PER_HR: { symbol: 'kg/hr', name: 'Kilograms per Hour', type: 'massflow' },
  RPM: { symbol: 'RPM', name: 'Revolutions per Minute', type: 'speed' },
  NEWTON_METER: { symbol: 'N·m', name: 'Newton Meter', type: 'torque' },
  KILONEWTON: { symbol: 'kN', name: 'Kilonewton', type: 'force' },
  MILLIMETER: { symbol: 'mm', name: 'Millimeter', type: 'length' },
  MILLIGRAM: { symbol: 'mg', name: 'Milligram', type: 'mass' },
  KILOGRAM: { symbol: 'KG', name: 'Kilogram', type: 'mass' },
  PASCAL_SECOND: { symbol: 'Pa·s', name: 'Pascal Second', type: 'viscosity' },
  PH: { symbol: 'pH', name: 'pH', type: 'concentration' },
  PERCENT: { symbol: '%', name: 'Percent', type: 'ratio' },
  PERCENT_RH: { symbol: '%RH', name: 'Percent Relative Humidity', type: 'humidity' },
  PARTICLES_PER_M3: { symbol: 'particles/m³', name: 'Particles per Cubic Meter', type: 'particlecount' },
  CUTS_PER_MIN: { symbol: 'cuts/min', name: 'Cuts per Minute', type: 'rate' },
  UNITS_PER_MIN: { symbol: 'units/min', name: 'Units per Minute', type: 'throughput' },
  EVENTS_PER_HR: { symbol: 'events/hr', name: 'Events per Hour', type: 'rate' },
  SIGMA: { symbol: 'σ', name: 'Standard Deviations', type: 'statistical' },
  SECONDS: { symbol: 's', name: 'Seconds', type: 'time' },
  MINUTES: { symbol: 'min', name: 'Minutes', type: 'time' },
};

/** Lookup unit by symbol string */
export function getUnitBySymbol(symbol) {
  return Object.values(UNITS).find(u => u.symbol === symbol) || null;
}
