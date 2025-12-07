
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrakeSystemScene } from './components/BrakeSystemScene';
import { Overlay } from './components/Overlay';
import { AppState, HandGesture } from './types';
import { detectGesture } from './utils/gestureHelpers';
import { SCENE_CONFIG } from './constants';

const App: React.FC = () => {
  // 核心状态
  const [appState, setAppState] = useState<AppState>({
    gesture: HandGesture.UNKNOWN,
    rotationY: 0,
    rotationX: 0,
    cameraDistance: SCENE_CONFIG.CAMERA_DEFAULT_DIST,
    isExploded: false,
    hasReassembled: false,
    isRedirecting: false, // 初始化为 false
  });

  // MediaPipe Hands 实例引用
  const handsRef = useRef<any>(null);
  
  // 用于去抖动 (Debounce) 的引用
  const lastGestureRef = useRef<HandGesture>(HandGesture.UNKNOWN);
  const gestureStabilityCounter = useRef<number>(0);
  const STABILITY_THRESHOLD = 2; // 降低阈值，提高响应速度

  // 防止处理帧堆积
  const isProcessingRef = useRef<boolean>(false);
  // 防止组件卸载后继续执行
  const isMountedRef = useRef<boolean>(true);

  // --- 修复后的跳转逻辑 (拆分为两个 Effect) ---

  // Effect 1: 监听手势，触发跳转状态 (UI 变化)
  useEffect(() => {
    // 逻辑：如果当前是聚合状态（isExploded 为 false），且手势是 ONE（数字1），且当前没有正在跳转
    if (!appState.isExploded && appState.gesture === HandGesture.ONE && !appState.isRedirecting) {
      setAppState(prev => ({ ...prev, isRedirecting: true }));
    }
  }, [appState.gesture, appState.isExploded, appState.isRedirecting]);

  // Effect 2: 监听跳转状态，执行实际跳转 (Side Effect)
  // 将定时器逻辑独立出来，避免因为 setAppState 导致的组件重渲染而意外清除定时器
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    
    if (appState.isRedirecting) {
      console.log("Initiating redirect sequence...");
      timer = setTimeout(() => {
         console.log("Redirecting now.");
         window.location.href = "https://temp-predict-campare.vercel.app/";
      }, 2000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [appState.isRedirecting]);

  // 初始化 MediaPipe
  useEffect(() => {
    isMountedRef.current = true;
    let handsInstance: any = null;

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true); // Already loading/loaded
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load script ${src}`));
        document.body.appendChild(script);
      });
    };

    const initMediaPipe = async () => {
      try {
        // Dynamically load MediaPipe Hands if not present
        if (!window.Hands) {
          console.log("Loading MediaPipe script...");
          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
        }
        
        // Wait a tiny bit just in case, though onload should handle it
        if (!window.Hands) {
           console.error("MediaPipe script loaded but window.Hands is undefined.");
           return;
        }

        // Prevent double initialization
        if (handsRef.current || !isMountedRef.current) return;

        console.log("Initializing MediaPipe Hands...");
        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        // 稍微降低置信度阈值，以便在光线不佳时更容易检测到手
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.4, 
          minTrackingConfidence: 0.4,
        });

        hands.onResults(onResults);
        
        // 保存实例
        handsRef.current = hands;
        handsInstance = hands;
      } catch (error) {
        console.error("Failed to initialize Hands:", error);
      }
    };

    initMediaPipe();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (handsInstance) {
        console.log("Cleaning up MediaPipe Hands...");
        try {
            handsInstance.close();
        } catch(e) {
            console.warn("Error closing hands instance", e);
        }
        handsRef.current = null;
      }
    };
  }, []);

  // MediaPipe 结果回调
  const onResults = useCallback((results: any) => {
    if (!isMountedRef.current) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // 1. 识别手势
      const rawGesture = detectGesture(landmarks);
      
      // 去抖动逻辑
      if (rawGesture === lastGestureRef.current) {
        gestureStabilityCounter.current++;
      } else {
        gestureStabilityCounter.current = 0;
        lastGestureRef.current = rawGesture;
      }

      // 是否确认为稳定手势
      const isStable = gestureStabilityCounter.current >= STABILITY_THRESHOLD;
      const stableGesture = isStable ? rawGesture : null;

      // 2. 识别旋转意图 
      // X轴 (左右旋转) - 根据手掌中心 X 坐标 (0.0 ~ 1.0)
      const handX = landmarks[9].x; 
      const targetRotationY = (0.5 - handX) * SCENE_CONFIG.ROTATION_SENSITIVITY * Math.PI;

      // Y轴 (上下旋转) - 根据手掌中心 Y 坐标 (0.0 top ~ 1.0 bottom)
      const handY = landmarks[9].y;
      // 映射: 手向上(y小) -> 模型后仰(x负) -> 抬头; 手向下(y大) -> 模型前倾(x正) -> 低头
      // 系数 0.8 是为了限制上下旋转的幅度，不要转到底部去
      const targetRotationX = (handY - 0.5) * SCENE_CONFIG.ROTATION_SENSITIVITY * Math.PI * 0.6;

      // 3. 识别缩放意图 (根据手掌大小 - 0号点手腕 到 9号点中指根部的距离)
      // 距离计算 (2D 平面)
      const wrist = landmarks[0];
      const middleMcp = landmarks[9];
      const handSize = Math.sqrt(Math.pow(wrist.x - middleMcp.x, 2) + Math.pow(wrist.y - middleMcp.y, 2));
      
      // 映射 Hand Size 到 Camera Distance
      // Hand Size: MIN (0.05 远) -> MAX (0.25 近)
      // Camera Dist: MAX (20 远) -> MIN (6 近)
      // 公式: Value = (Input - InMin) / (InMax - InMin)
      let sizeFactor = (handSize - SCENE_CONFIG.HAND_SIZE_MIN) / (SCENE_CONFIG.HAND_SIZE_MAX - SCENE_CONFIG.HAND_SIZE_MIN);
      sizeFactor = Math.max(0, Math.min(1, sizeFactor)); // Clamp 0-1
      
      // 线性插值计算目标距离 (Factor 越大，手越近，相机距离越小)
      const targetDist = SCENE_CONFIG.CAMERA_MAX_DIST - sizeFactor * (SCENE_CONFIG.CAMERA_MAX_DIST - SCENE_CONFIG.CAMERA_MIN_DIST);


      setAppState(prev => {
        // 如果正在跳转，锁定状态，不再响应手势变化
        if (prev.isRedirecting) return prev;

        // 如果当前手势稳定，则使用新手势，否则维持上一次的状态
        const confirmedGesture = stableGesture !== null ? stableGesture : prev.gesture;

        // 状态机转换逻辑
        let nextIsExploded = prev.isExploded;
        let nextHasReassembled = prev.hasReassembled;

        // 状态 A: 握拳 -> 张开 ==> 散开
        if (prev.gesture === HandGesture.FIST && confirmedGesture === HandGesture.OPEN_PALM) {
          nextIsExploded = true;
          // 重置 reassembled，因为又散开了
          nextHasReassembled = false; 
        }

        // 状态 C: 张开 -> 握拳 ==> 聚合
        if (prev.gesture === HandGesture.OPEN_PALM && confirmedGesture === HandGesture.FIST) {
          nextIsExploded = false;
          // 标记已经完成一次聚合，触发标题显示
          if (prev.isExploded) {
             nextHasReassembled = true; 
          }
        }
        
        // 旋转平滑处理
        // 只有张开手掌时才响应旋转控制
        const isControlling = confirmedGesture === HandGesture.OPEN_PALM;
        const nextRotationY = isControlling
            ? prev.rotationY + (targetRotationY - prev.rotationY) * 0.1 
            : prev.rotationY;
        
        // 增加上下旋转控制
        const nextRotationX = isControlling
            ? prev.rotationX + (targetRotationX - prev.rotationX) * 0.1
            : prev.rotationX;

        // 缩放平滑处理 (Always active based on hand presence, but smoother)
        const nextCameraDist = prev.cameraDistance + (targetDist - prev.cameraDistance) * 0.1;

        return {
          gesture: confirmedGesture,
          rotationY: nextRotationY,
          rotationX: nextRotationX,
          cameraDistance: nextCameraDist, 
          isExploded: nextIsExploded,
          hasReassembled: nextHasReassembled,
          isRedirecting: prev.isRedirecting, // Keep this state
        };
      });

    } else {
      // 没有检测到手
      setAppState(prev => {
         if (prev.isRedirecting) return prev; // Redirecting, ignore
         return {
          ...prev,
          gesture: HandGesture.UNKNOWN
          // 保持最后的 distance 和 rotation，避免跳变
         };
      });
    }
  }, []);

  // 处理视频帧
  const handleVideoFrame = useCallback(async (video: HTMLVideoElement) => {
    // 只有当前没有正在处理的任务时才发送，防止堆积导致 WASM 内存错误
    // 同时也检查视频尺寸，防止未初始化时的无效调用
    if (
      handsRef.current && 
      !isProcessingRef.current && 
      video.readyState >= 2 && // HAVE_CURRENT_DATA
      video.videoWidth > 0 && 
      video.videoHeight > 0 &&
      isMountedRef.current
    ) {
      isProcessingRef.current = true;
      try {
        await handsRef.current.send({ image: video });
      } catch (e) {
        console.error("MediaPipe processing error:", e);
      } finally {
        isProcessingRef.current = false;
      }
    }
  }, []);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {/* 3D 场景层 */}
      <div className="absolute inset-0 z-0">
        <BrakeSystemScene appState={appState} />
      </div>

      {/* UI 交互层 */}
      <Overlay appState={appState} onVideoFrame={handleVideoFrame} />
    </div>
  );
};

export default App;
