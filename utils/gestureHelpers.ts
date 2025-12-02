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

  let foldedFingers = 0;
  const tips = [8, 12, 16, 20]; // 除去大拇指
  const pips = [6, 10, 14, 18]; // 近指关节
  const mcps = [5, 9, 13, 17]; // 指根关节

  for (let i = 0; i < tips.length; i++) {
    const tipIndex = tips[i];
    const pipIndex = pips[i];
    const mcpIndex = mcps[i];
    
    // 宽松的判断逻辑：
    // 1. 如果指尖到手腕的距离 < 近指关节到手腕的距离 (严重弯曲)
    // 2. 或者指尖到手腕的距离 < 指根到手腕的距离 * 1.2 (轻微弯曲)
    const distTip = getDistance(landmarks[tipIndex], wrist);
    const distPip = getDistance(landmarks[pipIndex], wrist);
    const distMcp = getDistance(landmarks[mcpIndex], wrist);

    if (distTip < distPip || distTip < distMcp * 1.3) {
      foldedFingers++;
    }
  }

  // console.log('Folded fingers:', foldedFingers);

  // 宽松的拳头判断：只要有 3 个或以上手指弯曲就算拳头 (允许食指或小指没握紧)
  if (foldedFingers >= 3) {
    return HandGesture.FIST;
  }

  // 宽松的张开手掌判断：允许 1 个手指误判为弯曲 (通常是拇指或视角问题)
  // 只要大部分手指是直的，就算张开
  if (foldedFingers <= 1) {
    return HandGesture.OPEN_PALM;
  }

  return HandGesture.UNKNOWN;
};