import React from 'react';
import { Object3DNode } from '@react-three/fiber';
import * as THREE from 'three';

// 手势状态枚举
export enum HandGesture {
  UNKNOWN = 'UNKNOWN',
  OPEN_PALM = 'OPEN_PALM',
  FIST = 'FIST',
  ONE = 'ONE', // 新增：数字1手势
}

// 粒子类型
export type ParticleType = 'hero' | 'filler';

// 应用核心状态
export interface AppState {
  gesture: HandGesture; // 当前手势
  rotationY: number;    // 场景目标旋转角度 (左右)
  rotationX: number;    // 场景目标旋转角度 (上下) - 新增
  cameraDistance: number; // 摄像机距离 (Zoom)
  isExploded: boolean;  // 是否处于散开状态
  hasReassembled: boolean; // 是否已经完成了一次“散开-聚合”流程（用于触发标题）
  isRedirecting: boolean; // 新增：是否正在执行跳转过渡动画
}

// MediaPipe Window Interface augmentation
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
      group: Object3DNode<THREE.Group, typeof THREE.Group>;
      instancedMesh: Object3DNode<THREE.InstancedMesh, typeof THREE.InstancedMesh>;
      primitive: Object3DNode<any, any>;

      // Geometries
      boxGeometry: Object3DNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>;
      ringGeometry: Object3DNode<THREE.RingGeometry, typeof THREE.RingGeometry>;
      cylinderGeometry: Object3DNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>;
      dodecahedronGeometry: Object3DNode<THREE.DodecahedronGeometry, typeof THREE.DodecahedronGeometry>;

      // Materials
      meshStandardMaterial: Object3DNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>;
      meshBasicMaterial: Object3DNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>;

      // Lights
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
      directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
      spotLight: Object3DNode<THREE.SpotLight, typeof THREE.SpotLight>;
      pointLight: Object3DNode<THREE.PointLight, typeof THREE.PointLight>;

      // Misc
      fog: Object3DNode<THREE.Fog, typeof THREE.Fog>;
      color: Object3DNode<THREE.Color, typeof THREE.Color>;
    }
  }

  interface Window {
    Hands: any;
    Camera: any;
  }
}