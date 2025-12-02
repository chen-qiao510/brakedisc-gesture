
import React, { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { HandGesture, AppState } from '../types';
import { COLORS } from '../constants';

interface OverlayProps {
  appState: AppState;
  onVideoFrame: (video: HTMLVideoElement) => void;
}

export const Overlay: React.FC<OverlayProps> = ({ appState, onVideoFrame }) => {
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
        onVideoFrame(webcamRef.current.video);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [onVideoFrame]);

  // CSS Logic:
  // If reassembled: Fade in slowly (duration-2000), Delay to ensure it's elegant.
  // If NOT reassembled (reset/exploding): Vanish INSTANTLY (transition-none).
  const titleClass = appState.hasReassembled 
    ? 'opacity-100 translate-y-0 transition-all duration-[2000ms] ease-out delay-500' 
    : 'opacity-0 -translate-y-10 transition-none duration-0 delay-0';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-8 font-sans">
      
      {/* 顶部：标题区域 (Gemini Style) */}
      <div 
        className={`flex flex-col items-center pt-16 transform ${titleClass}`}
      >
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-center drop-shadow-[0_0_30px_rgba(66,133,244,0.6)]"
            style={{ 
              fontFamily: '"Inter", "Helvetica Neue", sans-serif',
              background: `linear-gradient(to right, ${COLORS.GEMINI_BLUE}, ${COLORS.GEMINI_PURPLE}, ${COLORS.GEMINI_PINK})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
          制动盘温升预测系统
        </h1>
        
        {/* 装饰线 */}
        <div className="w-64 h-1 mt-6 rounded-full" style={{
            background: `linear-gradient(to right, transparent, ${COLORS.GEMINI_BLUE}, transparent)`
        }}></div>
      </div>

      {/* 底部信息栏 */}
      <div className="flex justify-between items-end w-full">
        {/* 左下角：状态栏 */}
        <div className="bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl text-white max-w-sm transition-opacity duration-500 hover:bg-gray-900/80">
           <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
             <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: COLORS.GEMINI_BLUE }}></div>
             <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">System Status</h3>
           </div>
           
           <div className="space-y-3 font-mono text-sm">
             <div className="flex justify-between items-center">
               <span className="text-gray-400">GESTURE INPUT</span>
               <span className={`font-bold px-2 py-0.5 rounded text-xs transition-colors duration-300 ${
                 appState.gesture === HandGesture.FIST ? 'bg-red-500/20 text-red-300' : 
                 appState.gesture === HandGesture.OPEN_PALM ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-400'
               }`}>
                 {appState.gesture}
               </span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-gray-400">VISUAL MODE</span>
                <span className={`text-xs transition-colors duration-300 ${appState.isExploded ? 'text-blue-400' : 'text-gray-300'}`}>
                  {appState.isExploded ? 'PARTICLE CLOUD' : 'SOLID MODEL'}
                </span>
             </div>
           </div>
        </div>

        {/* 右下角：摄像头 */}
        <div className="relative w-48 h-36 bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl pointer-events-auto group">
           <Webcam
             ref={webcamRef}
             audio={false}
             mirrored={true}
             screenshotFormat="image/jpeg"
             className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 grayscale"
           />
           <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-gray-400 font-mono border border-white/5">
             SENSOR FEED
           </div>
        </div>
      </div>
    </div>
  );
};
