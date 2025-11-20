import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Mic, Square, Download, Globe, Video, MicOff, WifiOff, Keyboard, Bot, ZoomIn, ZoomOut, Move, GraduationCap, BookOpen, Eraser, MousePointer2 } from 'lucide-react';
import { AppState, AspectRatio, VoiceEffect, AvatarState, TranscriptionItem } from './types';
import { drawAvatar } from './components/Avatar';
import { GeminiService } from './services/geminiService';
import { float32ToInt16PCM, arrayBufferToBase64, createVoiceEffectNode, pcmToAudioBuffer } from './utils/audioUtils';

// Translation Dictionary
const TRANSLATIONS = {
  en: {
    title: "DIGITAL CLASSROOM",
    subtitle: "VIRTUAL TEACHER STUDIO",
    aspectRatio: "CANVAS RATIO",
    voiceEffect: "VOICE MODULATION",
    boardContent: "CHALKBOARD TEXT",
    micAccess: "MICROPHONE ACCESS",
    enableMic: "START CLASS (Enable Mic)",
    startRec: "START LESSON",
    recNew: "NEW LESSON",
    stopRec: "END LESSON",
    downloadRaw: "SAVE RECORDING",
    recording: "ON AIR",
    processing: "SAVING...",
    regionError: "REGION NOT SUPPORTED",
    networkError: "CONNECTION LOST",
    permissionError: "PERMISSION DENIED",
    interviewer: "TEACHING_ASSISTANT_AI",
    prompt: "Waiting for questions...",
    rec: "REC",
    instructions: "Teacher mimics your Mouse & Keyboard",
    voices: {
      none: "Normal",
      cute: "Young Teacher",
      deep: "Professor"
    }
  },
  zh: {
    title: "线上课堂",
    subtitle: "虚拟讲师工作台",
    aspectRatio: "画布比例",
    voiceEffect: "声音效果",
    boardContent: "黑板板书内容",
    micAccess: "需要麦克风权限",
    enableMic: "开始上课 (启用麦克风)",
    startRec: "开始录课",
    recNew: "新课程",
    stopRec: "下课 (结束录制)",
    downloadRaw: "保存视频",
    recording: "录制中",
    processing: "保存中...",
    regionError: "当前区域不支持",
    networkError: "网络连接中断",
    permissionError: "无法访问设备",
    interviewer: "助教 AI",
    prompt: "等待提问...",
    rec: "录制",
    instructions: "老师会模仿你的鼠标和键盘动作",
    voices: {
      none: "原声",
      cute: "青年教师",
      deep: "资深教授"
    }
  }
};

const getPreferredVideoFormat = () => {
  const types = [
    { mime: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', ext: 'mp4' },
    { mime: 'video/mp4; codecs="avc1.64001E, mp4a.40.2"', ext: 'mp4' },
    { mime: 'video/mp4; codecs=avc1', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm; codecs=vp9,opus', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' }
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type.mime)) {
      return { mimeType: type.mime, extension: type.ext };
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
};

export default function App() {
  const [uiLanguage, setUiLanguage] = useState<'en' | 'zh'>('zh');
  const t = TRANSLATIONS[uiLanguage];

  const [appState, setAppState] = useState<AppState>(AppState.Idle);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.NineSixteen);
  const [voiceEffect, setVoiceEffect] = useState<VoiceEffect>(VoiceEffect.None);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [interviewerPrompt, setInterviewerPrompt] = useState<string>("");
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [geminiOffline, setGeminiOffline] = useState(false);

  // Chalkboard Text State
  const [boardText, setBoardText] = useState({
    topLeft: "E = mc²",
    topRight: "1010101",
    bottomLeft: "√x",
    bottomRight: "∑"
  });

  // Avatar Position State (Relative to Canvas Center)
  const [avatarTransform, setAvatarTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, avatarX: 0, avatarY: 0 });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);
  const requestRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const recordedVideoBlobRef = useRef<Blob | null>(null);
  const recordingMimeTypeRef = useRef<string>('video/webm');
  
  // Input Tracking
  const inputState = useRef({
    keyLeft: false,
    keyRight: false,
    mouseDown: false,
    mouseX: 0,
    mouseY: 0,
    rawMouseX: 0, // For drag calculation
    rawMouseY: 0
  });
  
  const [avatarState, setAvatarState] = useState<AvatarState>({
    mouthOpen: 0,
    eyeX: 0,
    eyeY: 0,
    blink: false,
    keyPressLeft: false,
    keyPressRight: false,
    mouseDown: false
  });

  // --- Interaction Handlers (Move/Scale Avatar) ---
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scaleSensitivity = 0.001;
    const delta = -e.deltaY * scaleSensitivity;
    setAvatarTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(0.2, prev.scale + delta), 5)
    }));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // We still support dragging the whole avatar scene, but primary interaction is now mouse tracking
    setIsDragging(true);
    dragStartRef.current = { 
        x: e.clientX, 
        y: e.clientY,
        avatarX: avatarTransform.x,
        avatarY: avatarTransform.y
    };
    inputState.current.mouseDown = true;
  }, [avatarTransform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update Raw Mouse for Input
    inputState.current.rawMouseX = e.clientX;
    inputState.current.rawMouseY = e.clientY;
    
    // Handle Avatar Dragging
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setAvatarTransform(prev => ({
        ...prev,
        x: dragStartRef.current.avatarX + dx,
        y: dragStartRef.current.avatarY + dy
      }));
    }
    
    // Update Avatar Eye Tracking (Normalized -1 to 1 based on window center)
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    inputState.current.mouseX = x;
    inputState.current.mouseY = y;

  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    inputState.current.mouseDown = false;
  }, []);

  const resetAvatar = () => setAvatarTransform({ x: 0, y: 0, scale: 1 });

  // --- Initialization ---

  const requestMediaPermissions = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
      audioContextRef.current = ac;
      await ac.resume();
      setPermissionsGranted(true);
    } catch (err: any) {
      console.error("Permission denied", err);
      setErrorMsg(t.permissionError);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { inputState.current.keyLeft = true; };
    const handleKeyUp = (e: KeyboardEvent) => { inputState.current.keyLeft = false; };
    
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const blinkInterval = setInterval(() => {
        setAvatarState(prev => ({ ...prev, blink: true }));
        setTimeout(() => setAvatarState(prev => ({ ...prev, blink: false })), 150);
    }, 3500);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(blinkInterval);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [handleMouseUp]);

  const initGemini = useCallback(() => {
    try {
        geminiServiceRef.current = new GeminiService(
          (text, isUser) => {
            setTranscriptions(prev => {
               const now = Date.now();
               const relTime = isRecordingRef.current ? now - recordingStartTimeRef.current : 0;
               const last = prev[prev.length - 1];
               if (last && last.isUser === isUser && (now - last.timestamp < 2000)) {
                  const newHistory = [...prev];
                  newHistory[newHistory.length - 1] = { ...last, text: last.text + " " + text, timestamp: now };
                  return newHistory;
               }
               return [...prev, { text, isUser, timestamp: now, relativeTimestamp: relTime }];
            });
          },
          (text) => {
            setInterviewerPrompt(text);
            setTimeout(() => setInterviewerPrompt(""), 8000);
          },
          (error) => {
             console.error("Gemini Runtime Error:", error);
             setGeminiOffline(true);
             const msg = error.message.toLowerCase();
             if (msg.includes("region") || msg.includes("supported")) setErrorMsg(t.regionError);
             else if (msg.includes("network")) setErrorMsg(t.networkError);
             else setErrorMsg(`AI Error: ${error.message}`);
          }
        );
    } catch (e: any) {
        console.error("Failed to initialize Gemini Service", e);
        setErrorMsg("Failed to initialize AI service.");
    }
  }, [t]); 

  // --- Main Loop ---
  const animate = useCallback(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    
    // Audio Analysis
    if (audioContextRef.current && streamRef.current) {
        const ac = audioContextRef.current;
        if (!(window as any).sourceNode && streamRef.current.active) {
            try {
                const source = ac.createMediaStreamSource(streamRef.current);
                const analyser = ac.createAnalyser();
                analyser.fftSize = 512;
                const scriptProcessor = ac.createScriptProcessor(4096, 1, 1);
                source.connect(analyser); source.connect(scriptProcessor); scriptProcessor.connect(ac.destination); 
                (window as any).sourceNode = source; (window as any).analyserNode = analyser;
                
                scriptProcessor.onaudioprocess = (e) => {
                    if (isRecordingRef.current && geminiServiceRef.current && !geminiOffline) {
                       const inputData = e.inputBuffer.getChannelData(0);
                       geminiServiceRef.current.sendAudioChunk(arrayBufferToBase64(float32ToInt16PCM(inputData)));
                    }
                };
            } catch (e) { console.error(e); }
        }

        if ((window as any).analyserNode) {
            const analyser: AnalyserNode = (window as any).analyserNode;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            let sum = 0; for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
            const volume = sum / dataArray.length / 255;

            setAvatarState(prev => ({
                ...prev,
                mouthOpen: volume,
                eyeX: prev.eyeX + (inputState.current.mouseX - prev.eyeX) * 0.1,
                eyeY: prev.eyeY + (inputState.current.mouseY - prev.eyeY) * 0.1,
                keyPressLeft: inputState.current.keyLeft,
                keyPressRight: inputState.current.keyRight,
                mouseDown: inputState.current.mouseDown
            }));
        }
    }

    // --- Drawing Logic ---
    
    // 1. Classroom Background (Chalkboard Green)
    ctx!.fillStyle = '#2D4F38';
    ctx!.fillRect(0, 0, w, h);
    
    // Chalk Grid
    ctx!.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx!.lineWidth = 2;
    const gridSize = 100;
    ctx!.beginPath();
    for (let x = 0; x <= w; x += gridSize) { ctx!.moveTo(x, 0); ctx!.lineTo(x, h); }
    for (let y = 0; y <= h; y += gridSize) { ctx!.moveTo(0, y); ctx!.lineTo(w, y); }
    ctx!.stroke();

    // 2. Math Formulas (Decorations from State)
    ctx!.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx!.font = '40px "Fredoka"';
    
    // Top Left
    ctx!.textAlign = 'left';
    ctx!.fillText(boardText.topLeft, 50, 100);
    
    // Bottom Left
    ctx!.fillText(boardText.bottomLeft, 50, h - 50);

    // Bottom Right
    ctx!.textAlign = 'right';
    ctx!.fillText(boardText.bottomRight, w - 50, h - 50);

    // Top Right (Code Style)
    ctx!.font = '20px "Space Mono"';
    ctx!.textAlign = 'right';
    ctx!.fillText(boardText.topRight, w - 50, 100);

    // 3. Draw Avatar (Fox Teacher)
    drawAvatar(
        ctx!, 
        w, 
        h, 
        avatarState, 
        avatarTransform, 
        { x: inputState.current.mouseX, y: inputState.current.mouseY }
    );

    // 4. Subtitles (Captions style)
    if (transcriptions.length > 0) {
        const lastT = transcriptions[transcriptions.length - 1];
        const text = lastT.isUser ? lastT.text : ""; 
        if (text && (Date.now() - lastT.timestamp < 3000)) {
             ctx!.font = `600 ${Math.floor(w/30)}px "Noto Sans SC"`;
             ctx!.textAlign = 'center';
             
             // Text Background
             const metrics = ctx!.measureText(text);
             const txtH = Math.floor(w/30);
             const pad = 20;
             ctx!.fillStyle = 'rgba(0, 0, 0, 0.6)';
             ctx!.fillRect((w/2) - (metrics.width/2) - pad, h - 80 - txtH, metrics.width + (pad*2), txtH + pad);
             
             ctx!.fillStyle = '#FFB74D'; // Orange Text
             ctx!.fillText(text, w/2, h - 80);
        }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [appState, avatarState, transcriptions, avatarTransform, geminiOffline, boardText]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [animate]);

  useEffect(() => {
    if (canvasRef.current) {
        const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
        const height = 1080;
        const width = (height * ratioW) / ratioH;
        canvasRef.current.height = height;
        canvasRef.current.width = width;
    }
  }, [aspectRatio]);

  // --- Recorder Logic ---
  const startRecording = async () => {
    setErrorMsg(null);
    setGeminiOffline(false);
    setTranscriptions([]); 
    if (!permissionsGranted) await requestMediaPermissions();
    if (!geminiServiceRef.current) initGemini();

    try {
        try { if (geminiServiceRef.current) await geminiServiceRef.current.connect(language); } 
        catch (err: any) { 
            console.warn(err); 
            setGeminiOffline(true); 
            const msg = err.message || err.toString();
            if (msg.includes("Region")) setErrorMsg(t.regionError);
            else setErrorMsg(`AI Offline: ${msg}`);
        }

        const ac = audioContextRef.current;
        if (ac!.state === 'suspended') await ac!.resume();
        const dest = ac!.createMediaStreamDestination();
        const source = ac!.createMediaStreamSource(streamRef.current!);
        createVoiceEffectNode(ac!, source, voiceEffect, dest);
        const canvasStream = canvasRef.current!.captureStream(30);
        const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

        chunksRef.current = [];
        const { mimeType } = getPreferredVideoFormat();
        recordingMimeTypeRef.current = mimeType;
        const mr = new MediaRecorder(combinedStream, { mimeType });
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => {
            recordedVideoBlobRef.current = new Blob(chunksRef.current, { type: mimeType });
            setAppState(AppState.Finished);
            isRecordingRef.current = false;
            recordingStartTimeRef.current = 0;
            if (geminiServiceRef.current) geminiServiceRef.current.disconnect();
        };
        mr.start();
        isRecordingRef.current = true;
        recordingStartTimeRef.current = Date.now();
        mediaRecorderRef.current = mr;
        setAppState(AppState.Recording);
    } catch (err: any) { console.error(err); setErrorMsg(err.message); setAppState(AppState.Idle); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && appState === AppState.Recording) mediaRecorderRef.current.stop(); };
  const downloadOriginal = () => {
    if (!recordedVideoBlobRef.current) return;
    const url = URL.createObjectURL(recordedVideoBlobRef.current);
    const a = document.createElement('a');
    a.href = url;
    const ext = recordingMimeTypeRef.current.includes('mp4') ? 'mp4' : 'webm';
    a.download = `lesson-recording-${Date.now()}.${ext}`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#E0E0E0] text-school-text font-sans flex flex-col lg:flex-row overflow-hidden selection:bg-school-board selection:text-white">
      
      {/* Sidebar - Notebook Style */}
      <aside className="w-full lg:w-80 bg-school-paper border-r-4 border-school-wood p-6 flex flex-col gap-6 z-20 shadow-2xl h-auto lg:h-screen overflow-y-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
         
         {/* Header */}
         <div className="flex items-center justify-between mb-4 border-b-2 border-school-accent pb-4 border-dashed">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-school-board rounded-lg flex items-center justify-center text-white shadow-md">
                    <GraduationCap size={22} />
                 </div>
                 <div>
                   <h1 className="text-lg font-bold text-school-board leading-tight">{t.title}</h1>
                   <span className="text-[10px] text-school-wood uppercase tracking-wider font-bold">{t.subtitle}</span>
                 </div>
             </div>
             <button 
                onClick={() => { const n = uiLanguage === 'en' ? 'zh' : 'en'; setUiLanguage(n); setLanguage(n); }}
                className="flex items-center gap-1 text-xs bg-white border border-school-wood px-2 py-1 rounded hover:bg-school-beige transition-colors"
             >
                 <Globe size={12} /> {uiLanguage.toUpperCase()}
             </button>
         </div>

         <div className="space-y-6">
             {/* Ratio */}
             <div className="space-y-2">
                 <label className="text-xs font-bold text-school-board flex items-center gap-2">
                    <Square size={12} /> {t.aspectRatio}
                 </label>
                 <div className="grid grid-cols-4 gap-2">
                     {Object.values(AspectRatio).map(ratio => (
                         <button
                           key={ratio}
                           onClick={() => setAspectRatio(ratio)}
                           disabled={appState === AppState.Recording}
                           className={`py-2 text-[10px] font-bold rounded border-2 ${aspectRatio === ratio ? 'border-school-board bg-school-board text-white' : 'border-gray-300 bg-white text-gray-500 hover:border-school-wood'} transition-all`}
                         >
                           {ratio}
                         </button>
                     ))}
                 </div>
             </div>
             
             {/* Voice Effect */}
             <div className="space-y-2">
                 <label className="text-xs font-bold text-school-board flex items-center gap-2">
                    <Activity size={12} /> {t.voiceEffect}
                 </label>
                 <div className="relative">
                    <select 
                      value={voiceEffect}
                      onChange={(e) => setVoiceEffect(e.target.value as VoiceEffect)}
                      disabled={appState === AppState.Recording}
                      className="w-full p-2 bg-white border-2 border-gray-300 rounded text-xs text-school-text outline-none focus:border-school-accent appearance-none font-bold"
                    >
                        <option value={VoiceEffect.None}>{t.voices.none}</option>
                        <option value={VoiceEffect.Cute}>{t.voices.cute}</option>
                        <option value={VoiceEffect.Deep}>{t.voices.deep}</option>
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-gray-400">▼</div>
                 </div>
             </div>

             {/* Board Content Editor */}
             <div className="space-y-2">
                 <label className="text-xs font-bold text-school-board flex items-center gap-2">
                    <BookOpen size={12} /> {t.boardContent}
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                    <input 
                        type="text" 
                        value={boardText.topLeft}
                        onChange={e => setBoardText(p => ({...p, topLeft: e.target.value}))}
                        className="bg-school-boardDark/10 border border-school-wood rounded px-2 py-1 text-xs text-school-board font-mono placeholder-school-board/50 focus:outline-none focus:ring-1 focus:ring-school-accent"
                        placeholder="Top Left"
                    />
                    <input 
                        type="text" 
                        value={boardText.topRight}
                        onChange={e => setBoardText(p => ({...p, topRight: e.target.value}))}
                        className="bg-school-boardDark/10 border border-school-wood rounded px-2 py-1 text-xs text-school-board font-mono text-right placeholder-school-board/50 focus:outline-none focus:ring-1 focus:ring-school-accent"
                        placeholder="Top Right"
                    />
                    <input 
                        type="text" 
                        value={boardText.bottomLeft}
                        onChange={e => setBoardText(p => ({...p, bottomLeft: e.target.value}))}
                        className="bg-school-boardDark/10 border border-school-wood rounded px-2 py-1 text-xs text-school-board font-mono placeholder-school-board/50 focus:outline-none focus:ring-1 focus:ring-school-accent"
                        placeholder="Btm Left"
                    />
                    <input 
                        type="text" 
                        value={boardText.bottomRight}
                        onChange={e => setBoardText(p => ({...p, bottomRight: e.target.value}))}
                        className="bg-school-boardDark/10 border border-school-wood rounded px-2 py-1 text-xs text-school-board font-mono text-right placeholder-school-board/50 focus:outline-none focus:ring-1 focus:ring-school-accent"
                        placeholder="Btm Right"
                    />
                 </div>
             </div>

             <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-[11px] text-yellow-800 flex items-center gap-2">
                 <MousePointer2 size={14} />
                 {t.instructions}
             </div>
         </div>

         <div className="mt-auto pt-6">
             {errorMsg && (
                 <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold flex items-center gap-2 shadow-sm">
                     <WifiOff size={14} /> {errorMsg}
                 </div>
             )}

             {!permissionsGranted ? (
                <button onClick={requestMediaPermissions} className="w-full py-3 bg-school-board text-white rounded-lg shadow-lg hover:bg-school-boardDark transition-all text-sm font-bold flex items-center justify-center gap-2">
                    <Mic size={16} /> {t.enableMic}
                 </button>
             ) : appState === AppState.Idle || appState === AppState.Finished ? (
                 <div className="space-y-3">
                     {appState === AppState.Finished && (
                        <button onClick={downloadOriginal} className="w-full py-3 border-2 border-school-board text-school-board bg-white rounded-lg hover:bg-school-beige transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                            <Download size={16} /> {t.downloadRaw}
                        </button>
                     )}
                     <button 
                        onClick={startRecording}
                        className="w-full py-4 bg-school-accent text-white rounded-lg shadow-[0_4px_0_rgb(180,50,50)] active:shadow-none active:translate-y-1 transition-all font-bold flex items-center justify-center gap-2 text-sm"
                     >
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        {appState === AppState.Finished ? t.recNew : t.startRec}
                     </button>
                 </div>
             ) : (
                 <button onClick={stopRecording} className="w-full py-4 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-900 transition-all font-bold flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-sm" /> {t.stopRec}
                 </button>
             )}
         </div>
      </aside>

      {/* Main Stage */}
      <main className="flex-1 relative bg-[#3E2723] flex items-center justify-center overflow-hidden p-4 lg:p-8 cursor-move pattern-dots">
         {/* Wall/Background Texture behind Canvas */}
         <div className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>

         {/* Canvas Container */}
         <div 
            className="relative shadow-2xl rounded-xl overflow-hidden border-[12px] border-school-woodDark bg-black"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
         >
            {/* Chalk Tray Decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20 pointer-events-none z-10"></div>

            <canvas 
                ref={canvasRef} 
                className="block bg-school-board cursor-grab active:cursor-grabbing"
                style={{ maxHeight: '85vh', maxWidth: '100%' }}
            />

            {/* AI Overlay */}
            {interviewerPrompt && !geminiOffline && permissionsGranted && (
                <div className="absolute top-6 left-6 right-6 p-4 bg-white/95 text-school-text border-l-4 border-school-accent shadow-lg rounded-r-lg z-10 transition-all transform translate-y-0 opacity-100">
                    <div className="flex items-center gap-2 mb-1 text-[10px] uppercase font-bold text-school-board opacity-70">
                        <Bot size={12} /> {t.interviewer}
                    </div>
                    <p className="text-sm font-medium italic">"{interviewerPrompt}"</p>
                </div>
            )}

            {/* Rec Indicator */}
            {appState === AppState.Recording && (
                <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold shadow-md z-10">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    {t.rec}
                </div>
            )}
         </div>

         {/* Floating Controls */}
         <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-40">
            <div className="bg-white p-1 rounded-lg shadow-xl border border-gray-200 flex flex-col gap-1">
                <button onClick={() => setAvatarTransform(p => ({...p, scale: Math.min(5, p.scale + 0.1)}))} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ZoomIn size={20} /></button>
                <button onClick={() => setAvatarTransform(p => ({...p, scale: Math.max(0.2, p.scale - 0.1)}))} className="p-2 hover:bg-gray-100 rounded text-gray-600"><ZoomOut size={20} /></button>
                <div className="h-px bg-gray-200 my-1" />
                <button onClick={resetAvatar} className="p-2 hover:bg-gray-100 rounded text-school-accent" title="Reset Position"><Eraser size={20} /></button>
            </div>
         </div>

      </main>
    </div>
  );
}