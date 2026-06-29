/**
 * PlantFloorScene.jsx — 3D Plant Floor with React Three Fiber
 * Renders all 9 manufacturing stages as interactive 3D equipment models.
 */

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

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

function StatusLight({ isRunning, isActive }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (ref.current && isActive) {
      ref.current.material.emissiveIntensity = 1.5 + Math.sin(clock.getElapsedTime() * 3) * 0.5;
    }
  });

  return (
    <mesh ref={ref} position={[1.2, 1.7, 0]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial
        color={isRunning ? '#22c55e' : (isActive ? '#f59e0b' : '#555')}
        emissive={isRunning ? '#22c55e' : (isActive ? '#f59e0b' : '#333')}
        emissiveIntensity={isRunning ? 2 : 0.5}
      />
    </mesh>
  );
}

function MachineMesh({ position, stageId, label, color, equipment, currentStage, onClick }) {
  const isActive = currentStage === stageId;
  const stageEquip = equipment?.[stageId];
  const state = stageEquip?.state || 'Idle';
  const isRunning = state === 'Execute';
  const meshRef = useRef();

  const emissiveIntensity = isActive ? 0.6 : (isRunning ? 0.3 : 0.08);
  const scale = isActive ? 1.06 : 1;

  return (
    <group position={[position.x, 0, position.z]} onClick={(e) => { e.stopPropagation(); onClick(stageId); }}>
      {/* Machine body */}
      <mesh ref={meshRef} position={[0, 0.75, 0]} scale={[scale, scale, scale]} castShadow>
        <boxGeometry args={[2.8, 1.5, 2]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.3}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Control panel screen */}
      <mesh position={[0, 1.75, 0.9]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.04]} />
        <meshStandardMaterial
          color="#0a0a1e"
          emissive={isActive ? '#00ffcc' : '#222244'}
          emissiveIntensity={isActive ? 0.6 : 0.15}
        />
      </mesh>

      {/* Status indicator light with pulsing animation */}
      <StatusLight isRunning={isRunning} isActive={isActive} />

      {/* Machine base/platform */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[3.0, 0.05, 2.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.5} />
      </mesh>

      {/* Label using HTML overlay for reliable rendering */}
      <Html position={[0, 2.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          color: isActive ? '#00ffcc' : '#8888aa',
          fontSize: '11px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          textShadow: isActive ? '0 0 8px rgba(0,255,204,0.4)' : 'none',
        }}>
          {label}
        </div>
      </Html>

      {/* State badge */}
      <Html position={[0, -0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          color: isRunning ? '#22c55e' : '#555577',
          fontSize: '9px',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {state}
        </div>
      </Html>
    </group>
  );
}

function ConveyorBelt({ from, to }) {
  const midX = (from.x + to.x) / 2;
  const midZ = (from.z + to.z) / 2;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  return (
    <group>
      {/* Belt */}
      <mesh position={[midX, 0.08, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[length - 2.8, 0.06, 0.25]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.4} />
      </mesh>
      {/* Rail left */}
      <mesh position={[midX, 0.12, midZ + 0.15 * Math.cos(angle)]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[length - 2.8, 0.03, 0.02]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Rail right */}
      <mesh position={[midX, 0.12, midZ - 0.15 * Math.cos(angle)]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[length - 2.8, 0.03, 0.02]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

function CleanroomFloor() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 1]} receiveShadow>
        <planeGeometry args={[32, 18]} />
        <meshStandardMaterial color="#0c1222" metalness={0.05} roughness={0.95} />
      </mesh>
      {/* Grid overlay */}
      <Grid
        position={[0, 0, 1]}
        args={[32, 18]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1a2744"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#2a3b5c"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid={false}
      />
    </group>
  );
}

export default function PlantFloorScene({ equipment, campaign, onSelectStage }) {
  const currentStage = campaign?.currentStage;

  const handleClick = (stageId) => {
    if (onSelectStage) onSelectStage(stageId);
  };

  return (
    <Canvas
      camera={{ position: [0, 14, 20], fov: 45 }}
      shadows
      style={{ width: '100%', height: '100%', background: '#080c18' }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.25} color="#a0b4d0" />
      <directionalLight
        position={[10, 18, 12]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#e0e8ff"
      />
      <pointLight position={[-2, 6, 1]} intensity={0.3} color="#3ecfcf" distance={25} decay={2} />
      <pointLight position={[6, 6, 1]} intensity={0.2} color="#f59e0b" distance={20} decay={2} />

      {/* Cleanroom */}
      <CleanroomFloor />

      {/* Machines */}
      {STAGE_POSITIONS.map((sp) => (
        <MachineMesh
          key={sp.id}
          position={sp}
          stageId={sp.id}
          label={sp.label}
          color={sp.color}
          equipment={equipment}
          currentStage={currentStage}
          onClick={handleClick}
        />
      ))}

      {/* Conveyors connecting stages in sequence */}
      {STAGE_POSITIONS.slice(0, 5).map((sp, i) => (
        i < 4 && <ConveyorBelt key={`c1-${i}`} from={sp} to={STAGE_POSITIONS[i + 1]} />
      ))}
      <ConveyorBelt from={STAGE_POSITIONS[4]} to={STAGE_POSITIONS[5]} />
      {/* Vertical connection from Extrusion to Cutting */}
      <ConveyorBelt from={STAGE_POSITIONS[5]} to={STAGE_POSITIONS[6]} />
      <ConveyorBelt from={STAGE_POSITIONS[6]} to={STAGE_POSITIONS[7]} />
      <ConveyorBelt from={STAGE_POSITIONS[7]} to={STAGE_POSITIONS[8]} />

      {/* Camera Controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={6}
        maxDistance={35}
        target={[0, 0, 1]}
        enableDamping
        dampingFactor={0.08}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#080c18', 20, 50]} />
    </Canvas>
  );
}
