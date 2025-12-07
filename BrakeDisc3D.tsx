

import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from '../constants';
import '../types';

/**
 * 高仿真制动盘 3D 模型 (Ventilated Axle Disc)
 * Geometry: Standing on XY Plane, Thickness along Z Axis.
 */
interface BrakeDisc3DProps {
  isExploded: boolean;
}

export const BrakeDisc3D: React.FC<BrakeDisc3DProps> = ({ isExploded }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isHidden, setIsHidden] = useState(false);
  
  // Track state changes for animation timing
  const stateRef = useRef({
    lastIsExploded: isExploded,
    timeSinceChange: 0,
  });

  // Geometry Constants
  const RING_OUTER = 3.5;
  const RING_INNER = 2.2;
  const DISC_THICKNESS = 1.0; 
  const CHEEK_THICKNESS = 0.15;
  const VANE_COUNT = 48;

  // Materials with persistent references
  const materials = useMemo(() => {
    const metal = new THREE.MeshStandardMaterial({
      color: COLORS.DISC_METAL,
      metalness: 1.0,
      roughness: 0.3,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      envMapIntensity: 1.0,
    });

    const inner = new THREE.MeshStandardMaterial({
      color: COLORS.DISC_DARK,
      metalness: 0.5,
      roughness: 0.8,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide, 
    });
    
    return { metal, inner };
  }, []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Update timing tracking
      if (stateRef.current.lastIsExploded !== isExploded) {
        stateRef.current.lastIsExploded = isExploded;
        stateRef.current.timeSinceChange = 0;
      }
      stateRef.current.timeSinceChange += delta;

      // --- Fade Logic ---
      let targetOpacity = 1.0;
      let lerpSpeed = 10.0 * delta;

      if (isExploded) {
        // CASE: Exploding
        // Fade out immediately and fast
        targetOpacity = 0.0;
        lerpSpeed = 10.0 * delta;
      } else {
        // CASE: Reassembling (Particles coming back)
        // We must WAIT for particles to return before showing the solid model.
        // DustParticles logic takes some time.
        // 修改：增加等待时间到 1.5s，确保粒子已经完全“吸”回来了，实体模型再浮现。
        if (stateRef.current.timeSinceChange < 1.5) {
             // Keep hidden while particles travel
             targetOpacity = 0.0;
             lerpSpeed = 20.0 * delta; // Force it to stay down
        } else {
             // Particles have arrived, fade in solid model slowly
             targetOpacity = 1.0;
             // 减慢淡入速度，让过渡更自然 (从 2.0 降为 1.5)
             lerpSpeed = 1.5 * delta; 
        }
      }

      // Update Opacity
      let newOpacity = THREE.MathUtils.lerp(materials.metal.opacity, targetOpacity, lerpSpeed);
      
      // Snap to target if very close
      if (Math.abs(newOpacity - targetOpacity) < 0.01) {
        newOpacity = targetOpacity;
      }

      materials.metal.opacity = newOpacity;
      materials.inner.opacity = newOpacity;

      // --- Visibility Toggle ---
      // If opacity is effectively zero, hide the group completely
      const shouldHide = newOpacity <= 0.02;
      
      if (shouldHide !== isHidden) {
          setIsHidden(shouldHide);
      }
      
      // Update materials properties explicitly
      // Note: We don't change 'transparent' here as it causes shader recompilation/flicker
      materials.metal.visible = !shouldHide;
      materials.inner.visible = !shouldHide;
      materials.metal.depthWrite = !shouldHide;
      materials.inner.depthWrite = !shouldHide;
    }
  });

  return (
    <group ref={groupRef} visible={!isHidden}>
      {/* 1. Front Cheek (Friction Ring) */}
      <mesh 
        position={[0, 0, (DISC_THICKNESS - CHEEK_THICKNESS) / 2]} 
        material={materials.metal}
      >
        <ringGeometry args={[RING_INNER, RING_OUTER, 64]} />
      </mesh>

      {/* 2. Back Cheek (Friction Ring) */}
      <mesh 
        position={[0, 0, -(DISC_THICKNESS - CHEEK_THICKNESS) / 2]} 
        material={materials.metal}
      >
        <ringGeometry args={[RING_INNER, RING_OUTER, 64]} />
      </mesh>

      {/* 3. Inner Hub Connection (Cylinder Wall) */}
      <mesh 
        rotation={[Math.PI / 2, 0, 0]} 
        material={materials.inner}
      >
        <cylinderGeometry args={[RING_INNER, RING_INNER, DISC_THICKNESS - 0.02, 64, 1, true]} />
      </mesh>

      {/* 4. Ventilation Vanes */}
      {Array.from({ length: VANE_COUNT }).map((_, i) => {
        const angle = (i / VANE_COUNT) * Math.PI * 2;
        const r = (RING_OUTER + RING_INNER) / 2;
        const vaneLength = RING_OUTER - RING_INNER;
        const vaneThickness = 0.1;
        const vaneDepth = DISC_THICKNESS - CHEEK_THICKNESS * 2 - 0.02;

        return (
          <mesh
            key={`vane-${i}`}
            position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}
            rotation={[0, 0, angle]}
            material={materials.inner}
          >
            <boxGeometry args={[vaneLength, vaneThickness, vaneDepth]} />
          </mesh>
        );
      })}

      {/* 5. Bolts/Rivets (Decoration) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r = RING_INNER + 0.2; 
        return (
          <mesh 
            key={`bolt-${i}`}
            position={[Math.cos(angle) * r, Math.sin(angle) * r, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={materials.inner}
          >
             <cylinderGeometry args={[0.08, 0.08, DISC_THICKNESS, 8]} />
          </mesh>
        )
      })}
    </group>
  );
};