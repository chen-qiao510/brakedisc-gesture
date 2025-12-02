
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DUST_CONFIG, SCENE_CONFIG, COLORS } from '../constants';

interface DustParticlesProps {
  isExploded: boolean;
}

export const DustParticles: React.FC<DustParticlesProps> = ({ isExploded }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate Particles matching the new BrakeDisc3D Geometry (Z-Axis Thickness)
  const particles = useMemo(() => {
    const temp = [];
    const count = DUST_CONFIG.COUNT;

    for (let i = 0; i < count; i++) {
      // --- Assembled Position (The Disc) ---
      // Geometry: Ring from r=2.2 to 3.5. Thickness Z = -0.5 to 0.5
      
      const angle = Math.random() * Math.PI * 2;
      const rInner = 2.2;
      const rOuter = 3.5;
      
      // Random Radius (Area uniform)
      const r = Math.sqrt(Math.random() * (rOuter * rOuter - rInner * rInner) + rInner * rInner);
      
      // Random Thickness (Z)
      const halfThick = 0.5;
      const z = (Math.random() - 0.5) * (halfThick * 2);

      // XY Plane Position
      const xStart = Math.cos(angle) * r;
      const yStart = Math.sin(angle) * r;
      const zStart = z;

      // Add some "Hub" particles to fill the center slightly, creating a denser look
      // But keep them structured so they look like the mechanical part
      const isHub = Math.random() > 0.8;
      let pos;
      
      if (isHub) {
         // Inner cylinder wall particles
         const rHub = rInner;
         const angleHub = Math.random() * Math.PI * 2;
         const zHub = (Math.random() - 0.5) * 1.0;
         pos = new THREE.Vector3(Math.cos(angleHub) * rHub, Math.sin(angleHub) * rHub, zHub);
      } else {
         pos = new THREE.Vector3(xStart, yStart, zStart);
      }

      // --- Exploded Position (The Cloud) ---
      // Spherical explosion
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const dist = SCENE_CONFIG.EXPLOSION_RADIUS * (0.5 + Math.random() * 0.5);
      
      const xEnd = dist * Math.sin(phi) * Math.cos(theta);
      const yEnd = dist * Math.sin(phi) * Math.sin(theta);
      const zEnd = dist * Math.cos(phi);

      temp.push({
        assembled: pos,
        exploded: new THREE.Vector3(xEnd, yEnd, zEnd),
        rotationSpeed: Math.random() * 0.05,
        phaseOffset: Math.random() * Math.PI,
      });
    }
    return temp;
  }, []);

  const progressRef = useRef(0);

  useFrame((state, delta) => {
     if(!meshRef.current) return;

     // Animation Progress Target: 0 (Solid) <-> 1 (Exploded)
     const target = isExploded ? 1 : 0;
     
     // Animation Speed
     // Explode: Faster response to prevent lag feeling
     // Assemble: Snappy but controlled
     const speed = isExploded ? 1.2 : 1.5; 
     
     const diff = target - progressRef.current;
     if (Math.abs(diff) > 0.001) {
        progressRef.current += diff * speed * delta;
     }
     
     // Clamp 0-1
     const p = Math.max(0, Math.min(1, progressRef.current));
     const time = state.clock.getElapsedTime();

     particles.forEach((particle, i) => {
        // --- Animation Logic ---

        let moveFactor = 0;
        let scale = DUST_CONFIG.SIZE;

        if (isExploded) {
            // Case 1: EXPLOSION (Dissolving)
            // 之前的代码在这里有延迟 (p < 0.15 wait)，导致看起来卡顿。
            // 现在改为：只要开始爆炸，立即移动，但缩放从小变大
            
            // 移动：直接使用 p (线性或简单的缓动)
            moveFactor = p * (2 - p); // Ease out: 快速开始，慢速结束

            // 缩放：在开始的一瞬间 (0-0.2) 迅速变大
            // 避免粒子还没出现就开始飞
            if (p < 0.01) scale = 0;
            else if (p < 0.2) scale = (p / 0.2) * DUST_CONFIG.SIZE;
            else scale = DUST_CONFIG.SIZE;

        } else {
            // Case 2: ASSEMBLY (Reforming)
            // 聚合时，我们希望它们保持在外围，直到最后时刻才吸附进去
            // 以配合实体模型的出现
            
            if (p < 0.15) {
                // 最后阶段：吸附到位并隐藏
                moveFactor = 0;
                // 快速缩小消失
                if (p < 0.02) scale = 0;
                else scale = ((p - 0.02) / 0.13) * DUST_CONFIG.SIZE;
            } else {
                // 飞行阶段
                moveFactor = (p - 0.15) / 0.85;
                moveFactor = moveFactor * moveFactor; // Ease in (Quadratic): 远处慢，近处快
                scale = DUST_CONFIG.SIZE;
            }
        }

        const currentPos = new THREE.Vector3().lerpVectors(particle.assembled, particle.exploded, moveFactor);
        dummy.position.copy(currentPos);
        
        dummy.scale.set(scale, scale, scale);

        // Rotation
        dummy.rotation.set(time * particle.rotationSpeed, time * particle.rotationSpeed, 0);
        
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
     });
     
     meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DUST_CONFIG.COUNT]}>
      {/* Simple geometry for high performance */}
      <dodecahedronGeometry args={[1, 0]} />
      <meshBasicMaterial 
        color={COLORS.PARTICLE_GLOW} 
        transparent 
        opacity={0.8} 
        blending={THREE.AdditiveBlending} 
        depthWrite={false}
      />
    </instancedMesh>
  );
};
