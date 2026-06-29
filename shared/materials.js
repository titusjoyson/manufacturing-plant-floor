/**
 * materials.js — Bill of Materials with lot tracking for Zoladex 3.6mg
 * Supports Gap 2 (barcode verification) and Gap 5 (lot traceability).
 */

export const MATERIALS = {
  'PLGA-POLYMER': {
    materialId: 'PLGA-POLYMER',
    name: 'PLGA Polymer (poly(lactic-co-glycolic acid))',
    category: 'Active Excipient',
    uom: 'KG',
    storageConditions: '2-8°C, protect from moisture',
    shelfLifeMonths: 24,
  },
  'GOSERELIN-API': {
    materialId: 'GOSERELIN-API',
    name: 'Goserelin Acetate API',
    category: 'Active Pharmaceutical Ingredient',
    uom: 'KG',
    storageConditions: '-20°C, nitrogen atmosphere',
    shelfLifeMonths: 36,
  },
  'ACETIC-ACID': {
    materialId: 'ACETIC-ACID',
    name: 'Glacial Acetic Acid (pharma grade)',
    category: 'Solvent',
    uom: 'L',
    storageConditions: '15-25°C, ventilated area',
    shelfLifeMonths: 60,
  },
  'SYRINGE-14G': {
    materialId: 'SYRINGE-14G',
    name: 'Pre-sterilized 14G Hypodermic Syringe',
    category: 'Packaging Component',
    uom: 'EA',
    storageConditions: '15-25°C, sterile packaging',
    shelfLifeMonths: 36,
  },
  'NEEDLE-ASSEMBLY': {
    materialId: 'NEEDLE-ASSEMBLY',
    name: 'Safety Needle Assembly',
    category: 'Packaging Component',
    uom: 'EA',
    storageConditions: '15-25°C, sterile packaging',
    shelfLifeMonths: 36,
  },
  'FOIL-POUCH': {
    materialId: 'FOIL-POUCH',
    name: 'Moisture-proof Foil Pouch',
    category: 'Packaging Component',
    uom: 'EA',
    storageConditions: '15-25°C',
    shelfLifeMonths: 48,
  },
  'DESICCANT-SACHET': {
    materialId: 'DESICCANT-SACHET',
    name: 'Desiccant Sachet',
    category: 'Packaging Component',
    uom: 'EA',
    storageConditions: '15-25°C, sealed',
    shelfLifeMonths: 60,
  },
  'LABEL-ROLL': {
    materialId: 'LABEL-ROLL',
    name: 'Printed Label Roll (Zoladex 3.6mg)',
    category: 'Packaging Component',
    uom: 'EA',
    storageConditions: '15-25°C',
    shelfLifeMonths: 24,
  },
};

/**
 * Standard BOM for a single batch of Zoladex 3.6mg
 */
export const STANDARD_BOM = [
  { materialId: 'PLGA-POLYMER',     qtyPerBatch: 45,   uom: 'KG' },
  { materialId: 'GOSERELIN-API',    qtyPerBatch: 0.5,  uom: 'KG' },
  { materialId: 'ACETIC-ACID',      qtyPerBatch: 30,   uom: 'L' },
  { materialId: 'SYRINGE-14G',      qtyPerBatch: 5000, uom: 'EA' },
  { materialId: 'NEEDLE-ASSEMBLY',  qtyPerBatch: 5000, uom: 'EA' },
  { materialId: 'FOIL-POUCH',       qtyPerBatch: 5000, uom: 'EA' },
  { materialId: 'DESICCANT-SACHET', qtyPerBatch: 5000, uom: 'EA' },
  { materialId: 'LABEL-ROLL',       qtyPerBatch: 5200, uom: 'EA' },
];

/**
 * Generate a simulated lot number for a material.
 */
export function generateLotNumber(materialId, batchIndex = 0) {
  const prefix = materialId.substring(0, 4).toUpperCase();
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}-${dateStr}-${String(batchIndex + 1).padStart(3, '0')}`;
}

/**
 * Generate an expiry date based on shelf life.
 */
export function generateExpiryDate(materialId) {
  const mat = MATERIALS[materialId];
  if (!mat) return null;
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + mat.shelfLifeMonths);
  return expiry.toISOString();
}

/** Product definition */
export const PRODUCT = {
  materialId: 'ZOLADEX-3.6MG',
  name: 'Zoladex 3.6mg Depot Syringe',
  ndc: '0310-0950-98',
  targetDepotMass: 3.6, // mg
  targetDepotDiameter: 1.5, // mm
};
