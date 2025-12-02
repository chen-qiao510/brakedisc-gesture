

/**
 * 全局配置项
 * Global Configuration
 */

// 图片配置
export const IMAGE_CONFIG = {
  // =================================================================
  // 第一步：开关设置
  // true = 使用网络随机演示图片 (在线预览用)
  // false = 使用您本地的图片 (下载到本地运行后，请改为 false)
  // =================================================================
  USE_DEMO_IMAGES: true,
  
  // =================================================================
  // 第二步：修改照片数量
  // 如果您有 50 张照片，请将此处改为 50。代码会自动生成 50 个粒子。
  // 建议数量：30 - 100 之间 (数量过多可能会影响性能)
  // =================================================================
  COUNT: 30,

  // =================================================================
  // 第三步：本地图片路径配置
  // 1. 在项目根目录的 public 文件夹下创建 images 文件夹
  // 2. 将照片放入，并重命名为 1.jpg, 2.jpg, 3.jpg ... 
  // =================================================================
  LOCAL_PATH_PREFIX: 'images/',
  
  // 如果您的图片是 png 格式，请改为 '.png'
  EXTENSION: '.jpg',
  
  // 演示图片服务地址 (无需修改)
  DEMO_URL_PREFIX: 'https://picsum.photos/500/500?random=',
};

// 尘埃粒子配置
export const DUST_CONFIG = {
  COUNT: 5000, // Increased count for denser solid look
  SIZE: 0.06,
  // 颜色 - Gemini Blue/Purple tint
  COLOR: '#8ab4f8', 
};

// 3D 场景参数
export const SCENE_CONFIG = {
  // 制动盘模式下的半径
  DISC_RADIUS: 3.5,
  // 爆炸模式下的最大散开半径
  EXPLOSION_RADIUS: 25, 
  // 动画平滑度
  ANIMATION_SPEED: 0.03,
  // 手势旋转系数
  ROTATION_SENSITIVITY: 3.0,
  
  // 摄像机缩放配置
  CAMERA_MIN_DIST: 10,   // 最近距离 (放大) - Increased from 6
  CAMERA_MAX_DIST: 45,  // 最远距离 (缩小) - Increased from 20
  CAMERA_DEFAULT_DIST: 24, // Increased from 12
  
  // 手掌大小阈值 (用于计算距离)
  // MediaPipe 坐标是归一化的 (0-1)
  // 手掌越近，数值越大
  HAND_SIZE_MIN: 0.05, // 手离摄像头远
  HAND_SIZE_MAX: 0.35, // 手离摄像头近 - Increased to make zoom-in require closer hand
};

// 颜色配置
export const COLORS = {
  BACKGROUND_TOP: '#050505', 
  BACKGROUND_BOTTOM: '#1a1a2e', // Deep Blue/Purple bottom
  
  // Gemini Gradient Colors
  GEMINI_BLUE: '#4285f4',
  GEMINI_PURPLE: '#a142f4',
  GEMINI_PINK: '#f442a1',
  
  PARTICLE_GLOW: '#8ab4f8', // Light Blue glow
  DISC_METAL: '#e5e7eb',    // Much lighter silver
  DISC_DARK: '#4b5563',     // Lighter grey for inner parts
};