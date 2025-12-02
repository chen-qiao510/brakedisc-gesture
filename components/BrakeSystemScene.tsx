
import React, { useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { PhotoParticle } from './PhotoParticle';
import { DustParticles } from './DustParticles';
import { BrakeDisc3D } from './BrakeDisc3D';
import { IMAGE_CONFIG, COLORS, SCENE_CONFIG } from '../constants';
import { AppState } from '../types';

interface BrakeSystemSceneProps {
  appState: AppState;
}

// 独立的相机控制器，用于平滑处理缩放
const CameraRig: React.FC<{ distance: number }> = ({ distance }) => {
  const { camera } = useThree();
  
  useFrame(() => {
    // 获取当前相机方向向量
    const currentPos = camera.position.clone();
    // 计算方向 (normalized)
    const direction = currentPos.normalize();
    
    // 当前的实际距离
    // const currentDist = camera.position.length();
    
    // 我们直接设置新位置：保持方向不变，改变距离
    // 这里的 distance 已经是 App.tsx 经过 lerp 处理过的平滑值
    const newPos = direction.multiplyScalar(distance);
    
    camera.position.copy(newPos);
  });
  
  return null;
};

const SceneContent: React.FC<BrakeSystemSceneProps> = ({ appState }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Y轴旋转 (左右)
      const currentY = groupRef.current.rotation.y;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(currentY, appState.rotationY, 0.1);
      
      // X轴旋转 (上下) - 现在响应 appState.rotationX
      const currentX = groupRef.current.rotation.x;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(currentX, appState.rotationX, 0.1);
    }
  });

  // 生成主角照片列表 (Hero Images)
  const heroParticles = useMemo(() => {
    return Array.from({ length: IMAGE_CONFIG.COUNT }, (_, i) => {
      let path;
      if (IMAGE_CONFIG.USE_DEMO_IMAGES) {
        // 使用随机网络图片
        path = `${IMAGE_CONFIG.DEMO_URL_PREFIX}${i}`;
      } else {
        // 使用本地图片
        path = `${IMAGE_CONFIG.LOCAL_PATH_PREFIX}${i + 1}${IMAGE_CONFIG.EXTENSION}`;
      }

      return (
        <PhotoParticle 
          key={`hero-${i}`} 
          index={i} 
          isExploded={appState.isExploded}
          texturePath={path}
        />
      );
    });
  }, [appState.isExploded]);

  return (
    <>
      <CameraRig distance={appState.cameraDistance} />
      <group ref={groupRef}>
        <BrakeDisc3D isExploded={appState.isExploded} />
        <DustParticles isExploded={appState.isExploded} />
        {heroParticles}
      </group>
    </>
  );
};

export const BrakeSystemScene: React.FC<BrakeSystemSceneProps> = (props) => {
  return (
    <div className="w-full h-full relative">
      <Canvas 
        camera={{ position: [0, 2, SCENE_CONFIG.CAMERA_DEFAULT_DIST], fov: 45 }} 
        gl={{ 
            antialias: true, 
            toneMapping: THREE.ACESFilmicToneMapping, 
            toneMappingExposure: 1.0 
        }}
      >
        <color attach="background" args={[COLORS.BACKGROUND_TOP]} />
        <fog attach="fog" args={[COLORS.BACKGROUND_TOP, 10, 60]} />
        
        {/* --- 灯光系统升级 --- */}
        <ambientLight intensity={0.5} />
        
        {/* 主光源：照亮正面，确保金属不是黑色的 */}
        <directionalLight position={[5, 5, 10]} intensity={2.0} color="#ffffff" castShadow />
        
        {/* 轮廓光：Gemini Blue */}
        <spotLight 
            position={[-10, 0, -5]} 
            angle={0.5} 
            intensity={3} 
            color={COLORS.GEMINI_BLUE} 
        />
        
        {/* 补光：Gemini Pink */}
        <pointLight position={[10, -5, 5]} intensity={1} color={COLORS.GEMINI_PINK} />

        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
        
        {/* 添加 Environment 增加金属反射细节 */}
        <Environment preset="city" blur={0.8} background={false} />

        <Suspense fallback={null}>
            <SceneContent {...props} />
        </Suspense>

        <OrbitControls enableZoom={true} enablePan={false} maxDistance={30} minDistance={4} />
      </Canvas>
    </div>
  );
};
