import { HandGesture } from '../types';

/**
 * 计算两个点之间的欧几里得距离
 */
const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * 根据关键点判断手势
 * @param landmarks MediaPipe 返回的 21 个手部关键点
 */
export const detectGesture = (landmarks: any[]): HandGesture => {
  if (!landmarks || landmarks.length < 21) return HandGesture.UNKNOWN;

  // 关键点索引
  // 0: 手腕
  // 指尖: 8(食指), 12(中指), 16(无名指), 20(小指)
  // PIP (近指关节): 6, 10, 14, 18
  // MCP (指根关节): 5, 9, 13, 17
  
  const wrist = landmarks[0];

  // 辅助函数：判断单根手指是否弯曲
  const isFingerFolded = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
    const distTip = getDistance(landmarks[tipIdx], wrist);
    const distPip = getDistance(landmarks[pipIdx], wrist);
    const distMcp = getDistance(landmarks[mcpIdx], wrist);
    // 如果 指尖到手腕距离 < 近指关节到手腕距离 (严重弯曲)
    // 或者 指尖到手腕距离 < 指根到手腕距离 * 1.3 (轻微弯曲)
    return (distTip < distPip || distTip < distMcp * 1.3);
  };

  // 分别判断四根手指的状态 (拇指通常不参与核心判断)
  const isIndexFolded = isFingerFolded(8, 6, 5);   // 食指
  const isMiddleFolded = isFingerFolded(12, 10, 9); // 中指
  const isRingFolded = isFingerFolded(16, 14, 13);  // 无名指
  const isPinkyFolded = isFingerFolded(20, 18, 17); // 小指

  // --- 1. 判断数字 "1" 手势 ---
  // 逻辑：食指伸直 (没弯曲) + 中指弯曲 + 无名指弯曲 + 小指弯曲
  if (!isIndexFolded && isMiddleFolded && isRingFolded && isPinkyFolded) {
    return HandGesture.ONE;
  }

  // --- 2. 统计弯曲手指数量，用于判断拳头或手掌 ---
  let foldedCount = 0;
  if (isIndexFolded) foldedCount++;
  if (isMiddleFolded) foldedCount++;
  if (isRingFolded) foldedCount++;
  if (isPinkyFolded) foldedCount++;

  // 宽松的拳头判断：只要有 3 个或以上手指弯曲就算拳头
  if (foldedCount >= 3) {
    return HandGesture.FIST;
  }

  // 宽松的张开手掌判断：只要大部分手指是直的 (弯曲 <= 1)，就算张开
  if (foldedCount <= 1) {
    return HandGesture.OPEN_PALM;
  }

  return HandGesture.UNKNOWN;
};