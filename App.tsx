
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { geminiService } from './services/gemini';
import { 
  GeminiVisionResponse, 
  HazardRisk, 
  LogEntry, 
  GuidanceItem,
  SuggestedAction 
} from './types';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentRisk, setCurrentRisk] = useState<HazardRisk>(HazardRisk.LOW);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastSpokenRef = useRef<{ message: string; timestamp: number }[]>([]);
  // Fix: Replaced NodeJS.Timeout with number for browser compatibility.
  const loopTimeoutRef = useRef<number | null>(null);

  // Constants
  const DEFAULT_INTERVAL = 1000; // 1 fps
  const HIGH_RISK_INTERVAL = 500; // 2 fps

  // TTS Setup
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Cancel current to prioritize new
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Camera Initialization
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraReady(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Camera access denied. This app requires camera permissions to function.");
      }
    }
    setupCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, []);

  const addLog = useCallback((message: string, risk: HazardRisk = HazardRisk.LOW) => {
    setLogs(prev => [
      { id: Math.random().toString(), time: new Date().toLocaleTimeString(), message, risk },
      ...prev.slice(0, 19)
    ]);
  }, []);

  const processGuidance = useCallback((data: GeminiVisionResponse) => {
    setCurrentRisk(data.overall_risk);
    const now = Date.now();
    const expiryMs = (data.dont_repeat_for_seconds || 5) * 1000;

    // Filter out messages spoken recently
    const filteredGuidance = data.guidance.filter(item => {
      const lastSpoken = lastSpokenRef.current.find(s => s.message === item.message);
      if (lastSpoken && (now - lastSpoken.timestamp < expiryMs)) {
        return false;
      }
      return true;
    });

    // Speak top 2 items (prioritize non-disclaimer items first)
    const itemsToSpeak = filteredGuidance
      .filter(i => i.type !== 'info')
      .slice(0, 2);
    
    // Always consider the disclaimer if it hasn't been said in a long time (e.g. 60s)
    const disclaimer = data.guidance.find(i => i.type === 'info');
    const lastDisclaimer = lastSpokenRef.current.find(s => s.message.includes("Use caution"));
    if (disclaimer && (!lastDisclaimer || (now - lastDisclaimer.timestamp > 60000))) {
      itemsToSpeak.push(disclaimer);
    }

    if (itemsToSpeak.length > 0) {
      const combinedText = itemsToSpeak.map(i => i.message).join('. ');
      speak(combinedText);
      
      // Update spoken ref
      itemsToSpeak.forEach(i => {
        const existingIdx = lastSpokenRef.current.findIndex(s => s.message === i.message);
        if (existingIdx > -1) {
          lastSpokenRef.current[existingIdx].timestamp = now;
        } else {
          lastSpokenRef.current.push({ message: i.message, timestamp: now });
        }
      });
      
      // Clean up old spoken messages
      lastSpokenRef.current = lastSpokenRef.current.filter(s => now - s.timestamp < 120000);
      
      addLog(`Spoken: ${combinedText}`, data.overall_risk);
    } else {
      addLog("No new significant hazards detected.", data.overall_risk);
    }
  }, [addLog, speak]);

  const analyze = useCallback(async () => {
    if (!isActive || isAnalyzing || !videoRef.current || !canvasRef.current) return;

    setIsAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth / 2; // Downscale for faster upload
      canvas.height = video.videoHeight / 2;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.6);

      const recentMessages = lastSpokenRef.current.map(s => s.message).slice(-3);
      const result = await geminiService.analyzeFrame(base64, recentMessages);

      if (result) {
        processGuidance(result);
      } else {
        addLog("Analysis failed or returned empty.", HazardRisk.LOW);
      }
    }

    setIsAnalyzing(false);

    // Schedule next frame with adaptive rate
    const nextInterval = currentRisk === HazardRisk.HIGH ? HIGH_RISK_INTERVAL : DEFAULT_INTERVAL;
    loopTimeoutRef.current = window.setTimeout(analyze, nextInterval);
  }, [isActive, isAnalyzing, currentRisk, processGuidance, addLog]);

  useEffect(() => {
    if (isActive) {
      loopTimeoutRef.current = window.setTimeout(analyze, 100);
    } else {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    }
    return () => {
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    };
  }, [isActive, analyze]);

  const getRiskColor = (risk: HazardRisk) => {
    switch (risk) {
      case HazardRisk.HIGH: return 'bg-red-600';
      case HazardRisk.MEDIUM: return 'bg-yellow-600';
      default: return 'bg-green-600';
    }
  };

  return (
    <div className="relative h-screen w-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Background Camera Feed */}
      <div className="absolute inset-0 z-0 bg-gray-900 flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="h-full w-full object-cover opacity-60 grayscale-[30%]"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Header HUD */}
      <div className="relative z-10 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VisionGuide AI</h1>
          <p className="text-sm opacity-70">Mobility Assistant</p>
        </div>
        <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-lg transition-colors duration-500 ${getRiskColor(currentRisk)}`}>
          {currentRisk.toUpperCase()} RISK
        </div>
      </div>

      {/* Main Analysis Status */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        {!isActive ? (
          <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/20">
            <p className="mb-6 text-lg">Assistant is currently inactive.</p>
            <button 
              onClick={() => {
                setIsActive(true);
                speak("Assistant starting. Scanning surroundings.");
              }}
              disabled={!isCameraReady}
              className="w-48 h-48 rounded-full bg-white text-black font-black text-2xl shadow-[0_0_50px_rgba(255,255,255,0.4)] active:scale-95 transition-transform"
            >
              START
            </button>
          </div>
        ) : (
          <div className="pointer-events-none">
            {isAnalyzing && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium animate-pulse tracking-widest">ANALYZING...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Logs & Controls */}
      <div className="relative z-10 bg-gradient-to-t from-black via-black/90 to-transparent p-6 pb-12 safe-area-bottom">
        <div className="mb-4 h-32 overflow-y-auto space-y-2 scrollbar-hide text-sm">
          {logs.length === 0 ? (
             <p className="text-center opacity-40 italic">Waiting for analysis results...</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex gap-2 border-l-2 border-white/10 pl-3">
                <span className="opacity-40 whitespace-nowrap">{log.time}</span>
                <span className={log.risk === HazardRisk.HIGH ? 'text-red-400 font-bold' : log.risk === HazardRisk.MEDIUM ? 'text-yellow-400' : 'text-green-400'}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>

        {isActive && (
          <button 
            onClick={() => {
              setIsActive(false);
              speak("Assistant paused.");
            }}
            className="w-full bg-red-600/20 border border-red-500 text-red-100 py-4 rounded-2xl font-bold active:bg-red-600/40 transition-colors"
          >
            STOP ASSISTANT
          </button>
        )}
        
        <div className="mt-4 flex justify-center gap-6 text-[10px] opacity-40 uppercase tracking-widest font-bold">
          <span>{isActive ? (currentRisk === HazardRisk.HIGH ? '2 FPS' : '1 FPS') : 'Idle'}</span>
          <span>•</span>
          <span>Gemini 3 Flash</span>
          <span>•</span>
          <span>Low Latency Mode</span>
        </div>
      </div>
    </div>
  );
};

export default App;
