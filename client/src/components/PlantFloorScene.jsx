/**
 * PlantFloorScene.jsx — 3D Plant Floor with React Three Fiber
 * Renders all 9 manufacturing stages as interactive, realistic 3D equipment models.
 */

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTS & LAYOUT
// ═════════════════════════════════════════════════════════════════════════════

const STAGE_POSITIONS = [
  { id: 'SOLUTION_PREP', x: -12, z: 4, label: 'Solution Prep', color: '#3ecfcf' },
  { id: 'DRUM_FREEZING', x: -8, z: 4, label: 'Drum Freeze', color: '#4a9eff' },
  { id: 'LYOPHILIZATION', x: -4, z: 4, label: 'Lyophilization', color: '#7e6cff' },
  { id: 'EQUILIBRATION', x: 0, z: 4, label: 'Equilibration', color: '#a855f7' },
  { id: 'COMPACTION', x: 4, z: 4, label: 'Compaction', color: '#ec4899' },
  { id: 'MELT_EXTRUSION', x: 8, z: 4, label: 'Extrusion', color: '#f59e0b' },
  { id: 'CUTTING', x: 8, z: -2, label: 'Cutting', color: '#ef4444' },
  { id: 'CHECKWEIGHING', x: 4, z: -2, label: 'Checkweigh', color: '#22c55e' },
  { id: 'PACKAGING', x: 0, z: -2, label: 'Packaging', color: '#06b6d4' },
];

// ═════════════════════════════════════════════════════════════════════════════
// SHARED MATERIALS
// ═════════════════════════════════════════════════════════════════════════════

const MATS = {
  stainless: new THREE.MeshStandardMaterial({ color: '#cccccc', metalness: 0.85, roughness: 0.25 }),
  panelLight: new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.1, roughness: 0.3 }),
  panelDark: new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.5, roughness: 0.5 }),
  acrylic: new THREE.MeshPhysicalMaterial({
    color: '#aaddff',
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.9,
    opacity: 1,
    transparent: true,
    ior: 1.5,
    thickness: 0.1,
  }),
  screen: new THREE.MeshStandardMaterial({ color: '#0a0a1e', emissive: '#111133', emissiveIntensity: 0.5 }),
  belt: new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.2, roughness: 0.8 }),
  pipe: new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.6, roughness: 0.4 }),
};

// ═════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function getStateColor(state) {
  switch (state) {
    case 'Execute':
      return '#22c55e'; // Green
    case 'Starting':
    case 'Completing':
    case 'Resetting':
    case 'Unholding':
    case 'Clearing':
      return '#f59e0b'; // Orange/Amber
    case 'Held':
    case 'Holding':
    case 'Suspended':
    case 'Stopped':
    case 'Aborting':
    case 'Aborted':
      return '#ef4444'; // Red
    case 'Complete':
      return '#3ecfcf'; // Cyan
    default:
      return '#94a3b8'; // Gray
  }
}

function HumanAvatar({ name, role, color, position }) {
  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.4 }), [color]);
  const headMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffdbb5', roughness: 0.5 }), []);
  const capMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), []);

  return (
    <group position={position}>
      {/* Body (Cylinder) */}
      <mesh position={[0, 0.6, 0]} castShadow material={bodyMaterial}>
        <cylinderGeometry args={[0.15, 0.25, 1.2, 16]} />
      </mesh>
      {/* Head (Sphere) */}
      <mesh position={[0, 1.4, 0]} castShadow material={headMaterial}>
        <sphereGeometry args={[0.18, 16, 16]} />
      </mesh>
      {/* Cap / Hair (Sphere) */}
      <mesh position={[0, 1.55, 0]} material={capMaterial}>
        <sphereGeometry args={[0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Label */}
      <Html position={[0, 1.9, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#ffffff',
          fontSize: '8px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '2px 5px',
          borderRadius: '3px',
          border: `1px solid ${color}`,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
          letterSpacing: '0.02em'
        }}>
          👤 {name}
        </div>
      </Html>
    </group>
  );
}

function StatusLight({ isRunning, isActive, position = [0, 0, 0] }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && isActive) {
      ref.current.material.emissiveIntensity = 1.5 + Math.sin(clock.getElapsedTime() * 3) * 0.5;
    }
  });

  const baseColor = isRunning ? '#22c55e' : (isActive ? '#f59e0b' : '#555');
  const emissiveColor = isRunning ? '#22c55e' : (isActive ? '#f59e0b' : '#333');

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={isRunning ? 2 : 0.5}
      />
    </mesh>
  );
}

function MachineTelemetryOverlay({ sensors }) {
  const entries = Object.entries(sensors).slice(0, 2); // Show first 2 sensors
  if (entries.length === 0) return null;
  return (
    <div style={{
      marginTop: '4px',
      fontSize: '8px',
      color: 'rgba(255, 255, 255, 0.7)',
      fontFamily: "'JetBrains Mono', monospace",
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      background: 'rgba(15, 23, 42, 0.75)',
      padding: '4px 6px',
      borderRadius: '4px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      textAlign: 'left',
      minWidth: '100px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
    }}>
      {entries.map(([tagId, sensor]) => (
        <div key={tagId} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ color: 'var(--accent-cyan)' }}>{sensor.name}:</span>
          <span style={{ fontWeight: 600, color: '#fff' }}>
            {typeof sensor.value === 'number' ? sensor.value.toFixed(1) : sensor.value} {sensor.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function MachineBase({ isActive, label, state, onClick, showLabels, sensors = {}, children }) {
  const scale = isActive ? 1.05 : 1;
  const stateColor = getStateColor(state);
  
  return (
    <group scale={[scale, scale, scale]} onClick={onClick}>
      {children}

      {/* Machine Base Pedestal */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow material={MATS.panelDark}>
        <boxGeometry args={[3.2, 0.1, 2.4]} />
      </mesh>

      {/* HTML Labels */}
      {showLabels && (
        <>
          <Html position={[0, 3.2, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                color: isActive ? '#00ffcc' : '#e2e8f0',
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                textShadow: isActive ? '0 0 10px rgba(0,255,204,0.6)' : '1px 1px 2px rgba(0,0,0,0.8)',
              }}>
                {label}
              </div>
              <MachineTelemetryOverlay sensors={sensors} />
            </div>
          </Html>
          <Html position={[0, -0.4, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{
              color: stateColor,
              fontSize: '10px',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${stateColor}`,
            }}>
              {state}
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

function ControlPanelScreen({ position = [0, 1.2, 1.2], rotation = [-0.3, 0, 0], isActive }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Housing */}
      <mesh material={MATS.panelLight} castShadow>
        <boxGeometry args={[1.4, 0.9, 0.1]} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[1.2, 0.7, 0.02]} />
        <meshStandardMaterial
          color="#0a0a1e"
          emissive={isActive ? '#00ffcc' : '#1e293b'}
          emissiveIntensity={isActive ? 0.4 : 0.1}
        />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SPECIALIZED MACHINE MESHES
// ═════════════════════════════════════════════════════════════════════════════

function SolutionPrepMesh({ isRunning, isActive }) {
  const agitatorRef = useRef();
  
  useFrame((state, delta) => {
    if (isRunning && agitatorRef.current) {
      agitatorRef.current.rotation.y += delta * 5;
    }
  });

  return (
    <group>
      {/* Main Tank */}
      <mesh position={[0, 1.4, 0]} material={MATS.stainless} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.0, 2.6, 32]} />
      </mesh>
      {/* Tank Top Dome */}
      <mesh position={[0, 2.7, 0]} material={MATS.stainless} castShadow>
        <sphereGeometry args={[1.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Tank Bottom Dome */}
      <mesh position={[0, 0.1, 0]} material={MATS.stainless} castShadow>
        <sphereGeometry args={[1.0, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      {/* Agitator Motor */}
      <mesh position={[0, 3.8, 0]} material={MATS.panelDark} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.6, 16]} />
      </mesh>
      {/* Agitator Shaft (inside tank, but we show top part) */}
      <group ref={agitatorRef} position={[0, 3.4, 0]}>
        <mesh material={MATS.stainless}>
          <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        </mesh>
      </group>
      {/* Supports */}
      {[-1, 1].map(x => 
        [-1, 1].map(z => (
          <mesh key={`leg-${x}-${z}`} position={[x*0.7, 0.7, z*0.7]} material={MATS.pipe} castShadow>
             <cylinderGeometry args={[0.08, 0.08, 1.4, 8]} />
          </mesh>
        ))
      )}
      <ControlPanelScreen position={[0, 1.4, 1.1]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[0, 4.2, 0]} />
    </group>
  );
}

function DrumFreezeMesh({ isRunning, isActive }) {
  const drumRef = useRef();
  
  useFrame((state, delta) => {
    if (isRunning && drumRef.current) {
      drumRef.current.rotation.x += delta * 2;
    }
  });

  return (
    <group>
      {/* Housing */}
      <mesh position={[0, 1.2, -0.2]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[2.6, 2.2, 1.6]} />
      </mesh>
      {/* Rotating Drum */}
      <group position={[0, 1.2, 0.6]}>
         <mesh ref={drumRef} rotation={[0, 0, Math.PI / 2]} material={MATS.stainless} castShadow>
           <cylinderGeometry args={[0.8, 0.8, 2.2, 32]} />
         </mesh>
         {/* Glass Cover over Drum */}
         <mesh position={[0, 0, 0.4]} material={MATS.acrylic}>
           <boxGeometry args={[2.4, 1.8, 1.0]} />
         </mesh>
      </group>
      <ControlPanelScreen position={[-0.8, 2.6, 0.6]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[1.0, 2.5, 0.6]} />
    </group>
  );
}

function LyophilizerMesh({ isRunning, isActive }) {
  return (
    <group>
      {/* Main Chamber */}
      <mesh position={[0, 1.6, 0]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[2.8, 3.0, 2.0]} />
      </mesh>
      {/* Circular Pressure Door */}
      <mesh position={[0, 1.6, 1.05]} rotation={[Math.PI / 2, 0, 0]} material={MATS.stainless} castShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.15, 32]} />
      </mesh>
      {/* Window in Door */}
      <mesh position={[0, 1.6, 1.15]} rotation={[Math.PI / 2, 0, 0]} material={MATS.acrylic}>
        <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
      </mesh>
      {/* Vacuum Pipes on side */}
      <mesh position={[1.5, 1.6, 0]} rotation={[0, 0, Math.PI / 2]} material={MATS.pipe} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.6, 16]} />
      </mesh>
      <mesh position={[1.8, 1.0, 0]} material={MATS.stainless} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 2.0, 16]} />
      </mesh>
      <ControlPanelScreen position={[-1.6, 1.8, 0.5]} rotation={[0, Math.PI/4, 0]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[0, 3.2, 0.9]} />
    </group>
  );
}

function EquilibrationMesh({ isRunning, isActive }) {
  return (
    <group>
      {/* Tall Cabinet */}
      <mesh position={[0, 1.6, 0]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[2.0, 3.0, 1.6]} />
      </mesh>
      {/* Glass Windows */}
      <mesh position={[0, 1.6, 0.82]} material={MATS.acrylic}>
        <boxGeometry args={[1.6, 2.6, 0.05]} />
      </mesh>
      {/* Internal Racks */}
      {[1.0, 1.5, 2.0, 2.5].map((y, i) => (
        <mesh key={i} position={[0, y, 0.4]} material={MATS.stainless}>
          <boxGeometry args={[1.5, 0.02, 0.8]} />
        </mesh>
      ))}
      <ControlPanelScreen position={[1.2, 1.6, 0.5]} rotation={[0, -Math.PI/6, 0]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[0, 3.2, 0.7]} />
    </group>
  );
}

function CompactorMesh({ isRunning, isActive }) {
  const punchRef = useRef();
  
  useFrame((state, delta) => {
    if (isRunning && punchRef.current) {
      // Rapid up/down punching motion
      punchRef.current.position.y = 1.4 + Math.sin(state.clock.elapsedTime * 20) * 0.1;
    }
  });

  return (
    <group>
      {/* Base / Lower Compression Zone */}
      <mesh position={[0, 0.8, 0]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[2.0, 1.4, 1.8]} />
      </mesh>
      {/* Compression Area Glass Enclosure */}
      <mesh position={[0, 1.8, 0]} material={MATS.acrylic}>
        <boxGeometry args={[1.8, 0.8, 1.6]} />
      </mesh>
      {/* Moving Punch Mechanism inside */}
      <mesh ref={punchRef} position={[0, 1.4, 0]} material={MATS.stainless}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
      </mesh>
      {/* Upper Housing */}
      <mesh position={[0, 2.4, 0]} material={MATS.panelLight} castShadow>
        <boxGeometry args={[2.0, 0.6, 1.8]} />
      </mesh>
      {/* Feed Hopper */}
      <mesh position={[0, 3.1, 0]} material={MATS.stainless} castShadow>
        <cylinderGeometry args={[0.6, 0.2, 0.8, 32]} />
      </mesh>
      <ControlPanelScreen position={[0, 1.6, 1.1]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[0.8, 2.8, 0.8]} />
    </group>
  );
}

function ExtruderMesh({ isRunning, isActive }) {
  return (
    <group>
      {/* Extruder Motor/Drive Housing (Left) */}
      <mesh position={[-0.8, 1.0, 0]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.8, 1.8]} />
      </mesh>
      {/* Extruder Barrel (Horizontal) */}
      <mesh position={[1.0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={MATS.stainless} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.25, 2.0, 16]} />
      </mesh>
      {/* Heating Jackets around barrel */}
      {[0.4, 0.9, 1.4, 1.9].map((x, i) => (
        <mesh key={i} position={[x, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={MATS.panelDark} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.3, 16]} />
        </mesh>
      ))}
      {/* Die Head (Right) */}
      <mesh position={[2.1, 1.2, 0]} rotation={[0, 0, Math.PI / 2]} material={MATS.stainless} castShadow>
        <cylinderGeometry args={[0.3, 0.1, 0.3, 16]} />
      </mesh>
      <ControlPanelScreen position={[-0.4, 1.6, 1.0]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[-1.2, 2.0, 0.7]} />
    </group>
  );
}

function CutterMesh({ isRunning, isActive }) {
  const bladeRef = useRef();
  
  useFrame((state, delta) => {
    if (isRunning && bladeRef.current) {
      bladeRef.current.rotation.x -= delta * 15;
    }
  });

  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.8, 0]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[2.2, 1.4, 1.6]} />
      </mesh>
      {/* Safety Enclosure */}
      <mesh position={[0, 1.9, 0]} material={MATS.acrylic}>
        <boxGeometry args={[2.0, 1.0, 1.4]} />
      </mesh>
      {/* Cutting Mechanism */}
      <group position={[0, 1.6, 0]}>
        <mesh position={[0, 0.3, 0]} material={MATS.stainless}>
          <boxGeometry args={[0.4, 0.6, 0.6]} />
        </mesh>
        <mesh ref={bladeRef} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MATS.stainless}>
          <cylinderGeometry args={[0.4, 0.4, 0.05, 16]} />
        </mesh>
      </group>
      <ControlPanelScreen position={[0, 1.2, 0.9]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[0.8, 2.5, 0.5]} />
    </group>
  );
}

function CheckweigherMesh({ isRunning, isActive }) {
  return (
    <group>
      {/* Base Cabinet */}
      <mesh position={[0, 0.6, 0]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.0, 1.4]} />
      </mesh>
      {/* Scale Conveyor Deck */}
      <mesh position={[0, 1.2, 0]} material={MATS.stainless} castShadow>
        <boxGeometry args={[1.6, 0.1, 0.6]} />
      </mesh>
      {/* Display Tower */}
      <mesh position={[0, 1.8, -0.4]} material={MATS.stainless} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 16]} />
      </mesh>
      <ControlPanelScreen position={[0, 2.4, -0.2]} rotation={[0.2, 0, 0]} isActive={isActive} />
      
      {/* Reject Bin */}
      <mesh position={[0, 0.6, 1.2]} material={MATS.panelLight} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
      </mesh>
      
      <StatusLight isRunning={isRunning} isActive={isActive} position={[0, 2.9, -0.4]} />
    </group>
  );
}

function PackagingMesh({ isRunning, isActive }) {
  return (
    <group>
      {/* Main Base */}
      <mesh position={[0, 0.9, 0]} material={MATS.panelLight} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.6, 1.8]} />
      </mesh>
      {/* Material Reels (Blister Foil) */}
      <mesh position={[-1.2, 2.0, 0.4]} rotation={[Math.PI / 2, 0, 0]} material={MATS.stainless} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.6, 32]} />
      </mesh>
      <mesh position={[-0.4, 2.0, 0.4]} rotation={[Math.PI / 2, 0, 0]} material={MATS.stainless} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 32]} />
      </mesh>
      {/* Robotic Enclosure */}
      <mesh position={[1.0, 2.2, 0]} material={MATS.acrylic}>
        <boxGeometry args={[1.6, 1.2, 1.6]} />
      </mesh>
      {/* Internal Robotic Arm */}
      <group position={[1.0, 2.4, 0]}>
        <mesh position={[0, 0, 0]} material={MATS.stainless} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 16]} />
        </mesh>
        <mesh position={[0.2, -0.2, 0]} rotation={[0, 0, Math.PI / 4]} material={MATS.stainless} castShadow>
          <boxGeometry args={[0.6, 0.08, 0.08]} />
        </mesh>
      </group>
      <ControlPanelScreen position={[-1.2, 1.2, 1.0]} isActive={isActive} />
      <StatusLight isRunning={isRunning} isActive={isActive} position={[1.6, 2.9, 0.6]} />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MACHINE DISPATCHER
// ═════════════════════════════════════════════════════════════════════════════

function MachineDispatcher({ stageId, position, label, equipment, currentStage, onClick, showLabels }) {
  const isActive = currentStage === stageId;
  const equip = equipment?.[stageId];
  const state = equip?.state || 'Idle';
  const isRunning = state === 'Execute';
  const sensors = equip?.sensors || {};

  const props = { isRunning, isActive };

  let MeshComponent = null;
  switch (stageId) {
    case 'SOLUTION_PREP': MeshComponent = SolutionPrepMesh; break;
    case 'DRUM_FREEZING': MeshComponent = DrumFreezeMesh; break;
    case 'LYOPHILIZATION': MeshComponent = LyophilizerMesh; break;
    case 'EQUILIBRATION': MeshComponent = EquilibrationMesh; break;
    case 'COMPACTION': MeshComponent = CompactorMesh; break;
    case 'MELT_EXTRUSION': MeshComponent = ExtruderMesh; break;
    case 'CUTTING': MeshComponent = CutterMesh; break;
    case 'CHECKWEIGHING': MeshComponent = CheckweigherMesh; break;
    case 'PACKAGING': MeshComponent = PackagingMesh; break;
    default:
      MeshComponent = () => (
        <mesh position={[0, 0.8, 0]} material={MATS.panelLight}>
          <boxGeometry args={[2, 1.6, 2]} />
        </mesh>
      );
  }

  return (
    <group position={[position.x, 0, position.z]}>
      <MachineBase 
        isActive={isActive} 
        label={label} 
        state={state} 
        onClick={(e) => { e.stopPropagation(); onClick(stageId); }} 
        showLabels={showLabels}
        sensors={sensors}
      >
        <MeshComponent {...props} />
      </MachineBase>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE
// ═════════════════════════════════════════════════════════════════════════════

function ConveyorBelt({ from, to, isActive }) {
  const lineRef = useRef();
  
  useFrame((state) => {
    if (lineRef.current && isActive) {
      lineRef.current.material.dashOffset = state.clock.getElapsedTime() * 2;
    }
  });

  const midX = (from.x + to.x) / 2;
  const midZ = (from.z + to.z) / 2;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  
  const beltLength = Math.max(0, length - 2.8);

  return (
    <group position={[midX, 0, midZ]} rotation={[0, -angle, 0]}>
      {/* Belt */}
      <mesh position={[0, 1.0, 0]} material={MATS.belt} receiveShadow>
        <boxGeometry args={[beltLength, 0.04, 0.4]} />
      </mesh>

      {/* Moving green flow dashes along active conveyor belt */}
      {isActive && (
        <line ref={lineRef} position={[0, 1.03, 0]}>
          <bufferGeometry>
            <float32BufferAttribute 
              attach="attributes-position"
              args={[new Float32Array([-beltLength / 2, 0, 0, beltLength / 2, 0, 0]), 3]}
            />
          </bufferGeometry>
          <lineDashedMaterial 
            color="#22c55e" 
            dashSize={0.3} 
            gapSize={0.3} 
            transparent 
            opacity={0.9}
            linewidth={3}
          />
        </line>
      )}

      {/* Side Rails */}
      <mesh position={[0, 1.05, 0.22]} material={MATS.stainless} castShadow>
        <boxGeometry args={[beltLength, 0.06, 0.02]} />
      </mesh>
      <mesh position={[0, 1.05, -0.22]} material={MATS.stainless} castShadow>
        <boxGeometry args={[beltLength, 0.06, 0.02]} />
      </mesh>
      {/* Support Legs */}
      {[-beltLength/3, beltLength/3].map((x, i) => (
        <group key={i} position={[x, 0.5, 0]}>
          <mesh position={[0, 0, 0.15]} material={MATS.stainless} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
          </mesh>
          <mesh position={[0, 0, -0.15]} material={MATS.stainless} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
          </mesh>
          {/* Cross brace */}
          <mesh position={[0, -0.2, 0]} rotation={[Math.PI/2, 0, 0]} material={MATS.stainless} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CleanroomFloor() {
  const floorMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#081224',
      metalness: 0.8,
      roughness: 0.1, // Highly polished epoxy
      envMapIntensity: 1.0,
    });
  }, []);

  return (
    <group>
      {/* Highly Polished Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 1]} receiveShadow material={floorMat}>
        <planeGeometry args={[40, 20]} />
      </mesh>
      {/* Grid overlay for scale/tech look */}
      <Grid
        position={[0, -0.04, 1]}
        args={[40, 20]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#1a2744"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#2a3b5c"
        fadeDistance={40}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCENE
// ═════════════════════════════════════════════════════════════════════════════

export default function PlantFloorScene({ equipment, campaign, onSelectStage }) {
  const currentStage = campaign?.currentStage;

  const [showOperators, setShowOperators] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Dynamic positioning for operators
  const activePos = STAGE_POSITIONS.find(sp => sp.id === currentStage);
  
  const operatorPos = activePos 
    ? [activePos.x - 1.5, 0, activePos.z + 1.2] 
    : [-14, 0, 5];

  const matCoordPos = (campaign?.phase === 'SETUP' || !campaign || campaign?.phase === 'NOT_STARTED')
    ? [-12, 0, 5.2]
    : [-14, 0, 2];

  const qcAnalystPos = (currentStage === 'CHECKWEIGHING' || currentStage === 'PACKAGING')
    ? [activePos.x - 1.4, 0, activePos.z + 1.2]
    : [2, 0, 1.5];

  const opsCoordPos = [-2, 0, 1];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      
      {/* Viewport Control Panel Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 10,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid var(--surface-border)',
        borderRadius: '6px',
        pointerEvents: 'auto',
        minWidth: '130px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
          Viewport Controls
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', cursor: 'pointer', color: '#e2e8f0' }}>
          <input 
            type="checkbox" 
            checked={showOperators} 
            onChange={(e) => setShowOperators(e.target.checked)} 
            style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />
          Show Operators
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', cursor: 'pointer', color: '#e2e8f0' }}>
          <input 
            type="checkbox" 
            checked={showLabels} 
            onChange={(e) => setShowLabels(e.target.checked)} 
            style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
          />
          Show Labels
        </label>
      </div>

      <Canvas
        camera={{ position: [0, 16, 22], fov: 42 }}
        shadows
        style={{ width: '100%', height: '100%', background: '#050811' }}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        {/* Environment Lighting for Reflections */}
        <ambientLight intensity={0.4} color="#a0b4d0" />
        
        {/* Main Overhead Lighting */}
        <directionalLight
          position={[10, 25, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          color="#ffffff"
        />
        
        {/* Accents */}
        <pointLight position={[-8, 6, 4]} intensity={0.6} color="#3ecfcf" distance={20} decay={2} />
        <pointLight position={[6, 8, 0]} intensity={0.5} color="#f59e0b" distance={25} decay={2} />

        {/* Floor */}
        <CleanroomFloor />

        {/* Machines */}
        {STAGE_POSITIONS.map((sp) => (
          <MachineDispatcher
            key={sp.id}
            stageId={sp.id}
            position={sp}
            label={sp.label}
            equipment={equipment}
            currentStage={currentStage}
            onClick={onSelectStage}
            showLabels={showLabels}
          />
        ))}

        {/* Human Avatars */}
        {showOperators && (
          <group>
            <HumanAvatar name="J. Williams" role="Operator" color="#3ecfcf" position={operatorPos} />
            <HumanAvatar name="T. Al-Sabah" role="Material" color="#f59e0b" position={matCoordPos} />
            <HumanAvatar name="Dr. L. Chen" role="QC Analyst" color="#a855f7" position={qcAnalystPos} />
            <HumanAvatar name="S. Patel" role="Coordinator" color="#ec4899" position={opsCoordPos} />
          </group>
        )}

        {/* Conveyors with active flow line overlays */}
        {STAGE_POSITIONS.slice(0, 5).map((sp, i) => (
          i < 4 && <ConveyorBelt key={`c1-${i}`} from={sp} to={STAGE_POSITIONS[i + 1]} isActive={currentStage === sp.id} />
        ))}
        <ConveyorBelt from={STAGE_POSITIONS[4]} to={STAGE_POSITIONS[5]} isActive={currentStage === STAGE_POSITIONS[4].id} />
        <ConveyorBelt from={STAGE_POSITIONS[5]} to={STAGE_POSITIONS[6]} isActive={currentStage === STAGE_POSITIONS[5].id} />
        <ConveyorBelt from={STAGE_POSITIONS[6]} to={STAGE_POSITIONS[7]} isActive={currentStage === STAGE_POSITIONS[6].id} />
        <ConveyorBelt from={STAGE_POSITIONS[7]} to={STAGE_POSITIONS[8]} isActive={currentStage === STAGE_POSITIONS[7].id} />

        {/* Camera Controls */}
        <OrbitControls
          makeDefault
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={8}
          maxDistance={40}
          target={[0, 0, 1]}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Atmospheric Fog */}
        <fog attach="fog" args={['#050811', 20, 60]} />
      </Canvas>
    </div>
  );
}
