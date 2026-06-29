/**
 * equipmentHierarchy.js — ISA-95 Equipment Model / PI Asset Framework Tree
 * Defines the full plant hierarchy from Enterprise down to individual sensors.
 */

export const EQUIPMENT_HIERARCHY = {
  id: 'MACCLESFIELD',
  name: 'Macclesfield Campus',
  level: 'Enterprise',
  children: [
    {
      id: 'SPP5',
      name: 'SPP5 Facility',
      level: 'Site',
      children: [
        {
          id: 'ZOLADEX_LINE',
          name: 'Zoladex Production Line',
          level: 'Area',
          children: [
            {
              id: 'SOLUTION_PREP_CELL',
              name: 'Solution Prep Cell',
              level: 'ProcessCell',
              stageId: 'SOLUTION_PREP',
              units: [
                {
                  id: 'MIXING_TANK',
                  name: 'Mixing Tank Unit',
                  equipmentType: 'Tank',
                  sensorTags: ['TT-101', 'FT-101', 'PT-101', 'AT-101', 'PC-101'],
                },
              ],
            },
            {
              id: 'DRUM_FREEZING_CELL',
              name: 'Drum Freezing Cell',
              level: 'ProcessCell',
              stageId: 'DRUM_FREEZING',
              units: [
                {
                  id: 'CRYO_DRUM',
                  name: 'Cryogenic Drum Unit',
                  equipmentType: 'Drum',
                  sensorTags: ['TT-201', 'ST-201', 'FT-201', 'VT-201'],
                },
              ],
            },
            {
              id: 'LYOPHILIZATION_CELL',
              name: 'Lyophilization Cell',
              level: 'ProcessCell',
              stageId: 'LYOPHILIZATION',
              units: [
                {
                  id: 'FREEZE_DRYER',
                  name: 'Freeze Dryer Unit',
                  equipmentType: 'Lyophilizer',
                  sensorTags: ['PT-301', 'TT-301', 'TT-302', 'MT-301'],
                },
              ],
            },
            {
              id: 'EQUILIBRATION_CELL',
              name: 'Equilibration Cell',
              level: 'ProcessCell',
              stageId: 'EQUILIBRATION',
              units: [
                {
                  id: 'EQUIL_CABINET',
                  name: 'Equilibration Cabinet',
                  equipmentType: 'Cabinet',
                  sensorTags: ['TT-401', 'HT-401', 'TT-402'],
                },
              ],
            },
            {
              id: 'COMPACTION_CELL',
              name: 'Compaction Cell',
              level: 'ProcessCell',
              stageId: 'COMPACTION',
              units: [
                {
                  id: 'COMPACTION_PRESS',
                  name: 'Compaction Press Unit',
                  equipmentType: 'Press',
                  sensorTags: ['PT-501', 'DT-501', 'LT-501'],
                },
              ],
            },
            {
              id: 'EXTRUSION_CELL',
              name: 'Extrusion Cell',
              level: 'ProcessCell',
              stageId: 'MELT_EXTRUSION',
              units: [
                {
                  id: 'MELT_EXTRUDER',
                  name: 'Melt Extruder Unit',
                  equipmentType: 'Extruder',
                  sensorTags: ['TT-601', 'TT-602', 'TT-603', 'TQ-601', 'PT-601', 'VS-601'],
                },
              ],
            },
            {
              id: 'CUTTING_CELL',
              name: 'Cutting Cell',
              level: 'ProcessCell',
              stageId: 'CUTTING',
              units: [
                {
                  id: 'CUTTING_STATION',
                  name: 'Cutting Station',
                  equipmentType: 'Cutter',
                  sensorTags: ['BV-701', 'DC-701', 'MS-701'],
                },
              ],
            },
            {
              id: 'CHECKWEIGH_CELL',
              name: 'Checkweighing Cell',
              level: 'ProcessCell',
              stageId: 'CHECKWEIGHING',
              units: [
                {
                  id: 'CHECKWEIGHER',
                  name: 'Checkweigher Unit',
                  equipmentType: 'Scale',
                  sensorTags: ['WT-801', 'AR-801', 'SP-801'],
                },
              ],
            },
            {
              id: 'PACKAGING_CELL',
              name: 'Packaging Cell',
              level: 'ProcessCell',
              stageId: 'PACKAGING',
              units: [
                {
                  id: 'PACKAGING_STATION',
                  name: 'Packaging Station',
                  equipmentType: 'Packager',
                  sensorTags: ['TP-901', 'CT-901', 'LV-901'],
                },
              ],
            },
            {
              id: 'CLEANROOM_ENV',
              name: 'Cleanroom Environment',
              level: 'EnvironmentMonitor',
              stageId: 'ENVIRONMENT',
              units: [
                {
                  id: 'ENV_MONITOR',
                  name: 'Environmental Monitoring System',
                  equipmentType: 'Environment',
                  sensorTags: ['PC-ENV-05', 'PC-ENV-50', 'TT-ENV', 'HT-ENV'],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/**
 * Flatten hierarchy into a map of unitId → unit info for quick lookups.
 */
export function flattenUnits(node = EQUIPMENT_HIERARCHY, path = []) {
  const result = {};
  const currentPath = [...path, node.name];

  if (node.units) {
    for (const unit of node.units) {
      result[unit.id] = {
        ...unit,
        path: [...currentPath, unit.name],
        pathString: [...currentPath, unit.name].join(' → '),
        stageId: node.stageId,
        cellId: node.id,
      };
    }
  }

  if (node.children) {
    for (const child of node.children) {
      Object.assign(result, flattenUnits(child, currentPath));
    }
  }

  return result;
}

/** Pre-computed flat unit map */
export const UNIT_MAP = flattenUnits();
