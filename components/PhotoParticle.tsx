

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { SCENE_CONFIG, COLORS } from '../constants';
import '../types';

interface PhotoParticleProps {
  index: number;
  isExploded: boolean;
  texturePath?: string;
}

export const PhotoParticle: React.FC<PhotoParticleProps> = ({ index, isExploded, texturePath }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  // 1. 初始位置：混入制动盘内部，作为一个普通的点
  const assembledState = useMemo(() => {
    // 随机分布在盘体内部
    const rInner = 2.0;
    const rOuter = 3.5;
    const r = Math.sqrt(Math.random() * (rOuter*rOuter - rInner*rInner) + rInner*rInner);
    const theta = Math.random() * 2 * Math.PI;
    
    // 竖立状态
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const z = (Math.random() - 0.5) * 0.5;

    return { 
      pos: new Vector3(x, y, z), 
      rot: new Vector3(0, 0, 0),
      scale: 0.01 // 初始极小
    };
  }, []);

  // 2. 爆炸位置：最终的照片展示位
  const explodedState = useMemo(() => {
    // 立方体或大球体分布
    // 稍微扩大范围，并移除 Z 轴的偏移 (+5)，让它们分布在原点周围，离摄像机更远一些
    const range = 22; 
    const x = (Math.random() - 0.5) * range;
    const y = (Math.random() - 0.5) * range;
    const z = (Math.random() - 0.5) * range; // Removed +5 bias to center at origin
    
    // 随机朝向
    const rot = new Vector3(Math.random() * 0.5, Math.random() * 0.5, 0);

    return { 
      pos: new Vector3(x, y, z), 
      rot: rot,
      scale: 1.5 // 照片尺寸
    };
  }, []);

  // 纹理加载
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!texturePath) return;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(texturePath, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
    });
  }, [texturePath]);

  // 动画逻辑
  useFrame((state, delta) => {
    if (!meshRef.current || !matRef.current) return;

    // 目标选择
    const targetPos = isExploded ? explodedState.pos : assembledState.pos;
    const targetRot = isExploded ? explodedState.rot : assembledState.rot;
    // 如果是聚合状态，缩放为0（隐藏在实体模型里）；如果是爆炸状态，缩放为照片大小
    const targetScale = isExploded ? explodedState.scale : 0.05;

    // 平滑插值
    const moveSpeed = isExploded ? 2.0 : 3.0;
    meshRef.current.position.lerp(targetPos, moveSpeed * delta);
    
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRot.x, moveSpeed * delta);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot.y, moveSpeed * delta);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRot.z, moveSpeed * delta);

    const currentScale = meshRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, moveSpeed * delta);
    meshRef.current.scale.set(nextScale, nextScale, nextScale);

    // --- 材质变换核心 ---
    // 我们希望它在飞行过程中看起来像是一个发光的绿色粒子
    // 只有在到达位置并稳定下来后，才显现出照片
    
    // 计算归一化距离进度 (0 = at exploded pos, 1 = at assembled pos)
    const distToExploded = meshRef.current.position.distanceTo(explodedState.pos);
    const totalDist = assembledState.pos.distanceTo(explodedState.pos);
    const progress = 1 - Math.min(1, distToExploded / (totalDist * 0.5)); // 0.5 是让变化在后半程发生

    if (isExploded) {
        // 正在炸开：从 绿色粒子 -> 白色照片
        // 这里的 threshold 决定什么时候变身。如果在飞行的最后阶段才变身：
        const morphThreshold = 0.8; 
        
        // 颜色：如果不接近终点，保持绿色
        const isArriving = progress > morphThreshold;
        
        const greenColor = new THREE.Color(COLORS.PARTICLE_GLOW);
        const whiteColor = new THREE.Color('#FFFFFF');
        
        // 这是一个渐变
        matRef.current.color.lerp(isArriving ? whiteColor : greenColor, 0.1);
        
        // 纹理混合：未到达时 roughness 高（不反光），metalness 低
        matRef.current.roughness = isArriving ? 0.4 : 1.0;
        matRef.current.emissive.lerp(isArriving ? new THREE.Color('#000000') : greenColor, 0.1);
        matRef.current.emissiveIntensity = isArriving ? 0 : 2.0;

        // 如果还没到，不显示图片纹理 (通过 map 属性无法直接 lerp，我们用 color 覆盖)
        // 这里 trick：emissive 很强的时候，纹理看不清，像个光点
    } else {
        // 正在聚合回圆盘：变成绿色光点并缩小
        matRef.current.color.set(COLORS.PARTICLE_GLOW);
        matRef.current.emissive.set(COLORS.PARTICLE_GLOW);
        matRef.current.emissiveIntensity = 2.0;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 0.05]} />
      <meshStandardMaterial 
        ref={matRef}
        map={texture || undefined} 
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};