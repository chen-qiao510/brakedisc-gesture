
// 手势状态枚举
export enum HandGesture {
  UNKNOWN = 'UNKNOWN',
  OPEN_PALM = 'OPEN_PALM',
  FIST = 'FIST',
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
}

// MediaPipe Window Interface augmentation
declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}
