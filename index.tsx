import React, { useState, useRef, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

// --- Types & Mock Data ---

type Episode = {
  id: string;
  title: string;
  description: string;
  duration: string; // Display string like "45:00"
  audioUrl?: string; // For mock episodes
  date: string;
};

type Podcast = {
  id: string;
  title: string;
  host: string;
  topic: string;
  coverColor: string;
  episodes: Episode[];
};

type Recording = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  blobUrl: string;
  durationSec: number;
  date: string;
  trimStart: number;
  trimEnd: number;
};

type User = {
  name: string;
  avatarUrl: string;
  subscriptions: string[]; // Podcast IDs
  history: string[]; // Episode/Recording IDs
};

const MOCK_PODCASTS: Podcast[] = [
  {
    id: "p1",
    title: "Tech Horizons",
    host: "Sarah Jenkins",
    topic: "Technology",
    coverColor: "from-blue-500 to-cyan-500",
    episodes: [
      { 
        id: "e1", 
        title: "The Future of AI", 
        description: "Exploring the limits of LLMs.", 
        duration: "12:30", 
        date: "2023-10-01",
        audioUrl: "https://actions.google.com/sounds/v1/science_fiction/music_box_scary.ogg" 
      },
      { 
        id: "e2", 
        title: "Quantum Leaps", 
        description: "Is quantum computing real?", 
        duration: "15:45", 
        date: "2023-10-08",
        audioUrl: "https://actions.google.com/sounds/v1/science_fiction/humming_escalation.ogg"
      }
    ]
  },
  {
    id: "p2",
    title: "Midnight Mystery",
    host: "Detective Ray",
    topic: "True Crime",
    coverColor: "from-purple-600 to-indigo-900",
    episodes: [
      { 
        id: "e3", 
        title: "The Vanishing Key", 
        description: "A locked room mystery.", 
        duration: "22:10", 
        date: "2023-09-15",
        audioUrl: "https://actions.google.com/sounds/v1/horror/atmosphere_swamp.ogg"
      }
    ]
  },
  {
    id: "p3",
    title: "Daily Mindfulness",
    host: "Zen Master",
    topic: "Health",
    coverColor: "from-green-400 to-emerald-600",
    episodes: [
      { 
        id: "e4", 
        title: "Morning Breath", 
        description: "5 minutes to start your day.", 
        duration: "05:00", 
        date: "2023-10-12",
        audioUrl: "https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg"
      },
      { 
        id: "e5", 
        title: "Sleep Soundly", 
        description: "Relaxation techniques.", 
        duration: "10:00", 
        date: "2023-10-13",
        audioUrl: "https://actions.google.com/sounds/v1/water/stream_water_smacking_rocks.ogg"
      }
    ]
  }
];

// --- Icons (Lucide style SVGs) ---

const Icons = {
  Mic: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
  Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Play: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Pause: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Save: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Scissors: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
};

// --- Helper Functions ---

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// --- Components ---

// 1. Discovery View
const Discover = ({ 
  podcasts, 
  onSubscribe, 
  subscriptions,
  onPlay 
}: { 
  podcasts: Podcast[], 
  onSubscribe: (id: string) => void, 
  subscriptions: string[],
  onPlay: (item: Episode, context: string) => void
}) => {
  const [search, setSearch] = useState("");
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

  const filtered = podcasts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.topic.toLowerCase().includes(search.toLowerCase()) ||
    p.host.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedPodcast) {
    const isSubscribed = subscriptions.includes(selectedPodcast.id);
    return (
      <div className="p-6 space-y-6 animate-fade-in pb-24">
        <button onClick={() => setSelectedPodcast(null)} className="text-gray-400 hover:text-white mb-4">
          ← Back to Browse
        </button>
        <div className={`h-48 rounded-xl bg-gradient-to-br ${selectedPodcast.coverColor} flex items-end p-6 shadow-lg`}>
          <div>
            <h1 className="text-3xl font-bold text-white">{selectedPodcast.title}</h1>
            <p className="text-white/80">{selectedPodcast.host}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
            <span className="text-sm text-indigo-300 font-medium px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                {selectedPodcast.topic}
            </span>
            <button 
                onClick={() => onSubscribe(selectedPodcast.id)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                    isSubscribed 
                    ? "bg-zinc-800 text-white border border-zinc-700" 
                    : "bg-white text-black hover:bg-gray-200"
                }`}
            >
                {isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Episodes</h2>
          {selectedPodcast.episodes.map(ep => (
            <div key={ep.id} className="group bg-zinc-900/50 hover:bg-zinc-800 p-4 rounded-lg transition-colors border border-zinc-800/50 hover:border-zinc-700">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">{ep.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{ep.description}</p>
                    <div className="mt-2 text-xs text-gray-500">{ep.date} • {ep.duration}</div>
                </div>
                <button 
                    onClick={() => onPlay(ep, selectedPodcast.title)}
                    className="ml-4 p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
                >
                    <Icons.Play />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      <div className="relative">
        <Icons.Search />
        <input 
          type="text" 
          placeholder="Search podcasts, topics, or hosts..." 
          className="w-full bg-zinc-900 pl-10 pr-4 py-3 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-zinc-800"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="absolute left-3 top-3.5 text-zinc-500 pointer-events-none">
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Trending Now</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(podcast => (
            <div 
              key={podcast.id} 
              onClick={() => setSelectedPodcast(podcast)}
              className="cursor-pointer bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 p-4 rounded-xl transition-all hover:-translate-y-1 shadow-sm hover:shadow-md group"
            >
              <div className={`h-32 rounded-lg bg-gradient-to-br ${podcast.coverColor} mb-4 group-hover:brightness-110 transition-all`}></div>
              <h3 className="font-bold text-white text-lg">{podcast.title}</h3>
              <p className="text-zinc-400 text-sm">{podcast.host}</p>
              <p className="text-indigo-400 text-xs mt-2 uppercase tracking-wider font-bold">{podcast.topic}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. Studio View
const Studio = ({ onSaveRecording }: { onSaveRecording: (rec: Recording) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [view, setView] = useState<"record" | "edit">("record");
  
  // Edit State
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100); // Percentage
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMetadata, setGeneratedMetadata] = useState<{title: string, summary: string, tags: string[]} | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Canvas Visualizer
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyzerRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i] / 2;
      ctx.fillStyle = `rgb(${barHeight + 100}, 100, 250)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Visualizer Setup
      if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current!;
      analyzerRef.current = ctx.createAnalyser();
      analyzerRef.current.fftSize = 256;
      sourceRef.current = ctx.createMediaStreamSource(stream);
      sourceRef.current.connect(analyzerRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setView("edit");
        // Cleanup visualizer
        cancelAnimationFrame(animationFrameRef.current);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      drawVisualizer();

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required to record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const generateMetadata = async () => {
    if (!audioBlob || !process.env.API_KEY) return;
    setIsGenerating(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const b64 = await blobToBase64(audioBlob);
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { text: "Analyze this podcast audio segment. Generate a catchy title, a 2-sentence engaging summary, and 3 relevant hashtags." },
                    {
                        inlineData: {
                            mimeType: "audio/webm",
                            data: b64
                        }
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (text) {
            const data = JSON.parse(text);
            setGeneratedMetadata(data);
        }

    } catch (e) {
        console.error("Gemini Error:", e);
        alert("AI generation failed. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const save = () => {
    if (!audioBlob) return;
    const rec: Recording = {
        id: Date.now().toString(),
        blobUrl: URL.createObjectURL(audioBlob),
        title: generatedMetadata?.title || `Recording ${new Date().toLocaleDateString()}`,
        description: generatedMetadata?.summary || "No description.",
        tags: generatedMetadata?.tags || [],
        durationSec: duration,
        date: new Date().toLocaleDateString(),
        trimStart: (trimStart / 100) * duration,
        trimEnd: (trimEnd / 100) * duration,
    };
    onSaveRecording(rec);
    // Reset
    setAudioBlob(null);
    setView("record");
    setGeneratedMetadata(null);
  };

  if (view === "edit" && audioBlob) {
    return (
        <div className="p-6 flex flex-col items-center space-y-8 pb-24 animate-fade-in">
            <h2 className="text-2xl font-bold text-white">Studio Editor</h2>
            
            <div className="w-full bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-center h-32 bg-zinc-950 rounded-lg mb-6 relative overflow-hidden">
                   {/* Simplified visual for waveform */}
                   <div className="flex gap-1 items-center h-full w-full px-4 justify-center opacity-50">
                       {Array.from({length: 30}).map((_, i) => (
                           <div key={i} className="w-2 bg-indigo-500 rounded-full" style={{height: `${Math.random() * 80 + 20}%`}}></div>
                       ))}
                   </div>
                   {/* Trimming overlay */}
                   <div className="absolute inset-0 pointer-events-none flex justify-between">
                       <div className="h-full bg-black/60 backdrop-blur-sm" style={{width: `${trimStart}%`}}></div>
                       <div className="h-full bg-black/60 backdrop-blur-sm" style={{width: `${100 - trimEnd}%`}}></div>
                   </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-xs text-zinc-400 uppercase font-bold tracking-wider">
                        <span>Trim Start</span>
                        <span>Trim End</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" value={trimStart} 
                        onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 5))}
                        className="w-full accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <input 
                        type="range" min="0" max="100" value={trimEnd} 
                        onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 5))}
                        className="w-full accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            <div className="w-full space-y-4">
                {!generatedMetadata ? (
                    <button 
                        onClick={generateMetadata}
                        disabled={isGenerating}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <span className="animate-pulse">Thinking...</span>
                        ) : (
                            <>
                                <Icons.Sparkles />
                                Generate AI Magic Metadata
                            </>
                        )}
                    </button>
                ) : (
                    <div className="bg-zinc-900 border border-indigo-500/30 p-4 rounded-xl space-y-3 animate-slide-up">
                        <div>
                            <label className="text-xs text-indigo-400 font-bold uppercase">Title</label>
                            <input 
                                value={generatedMetadata.title} 
                                onChange={(e) => setGeneratedMetadata({...generatedMetadata, title: e.target.value})}
                                className="w-full bg-transparent text-xl font-bold text-white focus:outline-none border-b border-zinc-700 pb-1"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-indigo-400 font-bold uppercase">Summary</label>
                            <textarea 
                                value={generatedMetadata.summary} 
                                onChange={(e) => setGeneratedMetadata({...generatedMetadata, summary: e.target.value})}
                                className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none resize-none h-20"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {generatedMetadata.tags.map((tag, i) => (
                                <span key={i} className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">#{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setView("record")} className="py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700">Discard</button>
                    <button onClick={save} className="py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 flex items-center justify-center gap-2">
                        <Icons.Save /> Save Podcast
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full items-center justify-center p-6 space-y-8 pb-24">
        <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-white">Record Episode</h2>
            <p className="text-zinc-400">Share your voice with the world</p>
        </div>

        <div className="relative">
            {/* Visualizer Canvas Background */}
            <canvas ref={canvasRef} width="300" height="300" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-30 pointer-events-none rounded-full blur-md"></canvas>

            <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isRecording ? "bg-red-500 scale-110 ring-8 ring-red-500/30" : "bg-indigo-600 hover:bg-indigo-500 ring-8 ring-indigo-600/20"}`}
            >
                {isRecording ? (
                    <div className="w-8 h-8 bg-white rounded-md" />
                ) : (
                    <div className="text-white transform scale-150"><Icons.Mic /></div>
                )}
            </button>
        </div>

        <div className="text-center">
            <div className="text-5xl font-mono font-bold text-white tabular-nums tracking-wider">
                {formatTime(duration)}
            </div>
            {isRecording && <div className="text-red-400 text-sm mt-2 animate-pulse font-medium">Recording in progress...</div>}
        </div>
    </div>
  );
};

// 3. Profile View
const Profile = ({ 
  user, 
  setUser, 
  myRecordings, 
  onPlayRecording 
}: { 
  user: User, 
  setUser: any, 
  myRecordings: Recording[], 
  onPlayRecording: (r: Recording) => void 
}) => {
    const [tab, setTab] = useState<"recordings" | "subscriptions">("recordings");

    return (
        <div className="p-6 pb-24 space-y-8">
            <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 border-2 border-zinc-700">
                    {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" /> : <Icons.User />}
                </div>
                <div className="flex-1">
                    <input 
                        value={user.name}
                        onChange={(e) => setUser({...user, name: e.target.value})}
                        className="bg-transparent text-2xl font-bold text-white focus:outline-none border-b border-transparent focus:border-zinc-700 w-full"
                    />
                    <p className="text-zinc-500 text-sm">{user.subscriptions.length} Subscriptions • {myRecordings.length} Recordings</p>
                </div>
            </div>

            <div>
                <div className="flex space-x-6 border-b border-zinc-800 pb-1 mb-6">
                    <button 
                        onClick={() => setTab("recordings")}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${tab === "recordings" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        My Recordings
                    </button>
                    <button 
                        onClick={() => setTab("subscriptions")}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${tab === "subscriptions" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                        Subscriptions
                    </button>
                </div>

                {tab === "recordings" ? (
                    <div className="space-y-4">
                        {myRecordings.length === 0 && <div className="text-zinc-500 text-center py-10">No recordings yet. Go to Studio!</div>}
                        {myRecordings.map(rec => (
                            <div key={rec.id} className="bg-zinc-900 p-4 rounded-xl flex items-center justify-between group border border-zinc-800">
                                <div>
                                    <h3 className="font-bold text-white">{rec.title}</h3>
                                    <p className="text-zinc-400 text-xs mt-1 max-w-[200px] truncate">{rec.description}</p>
                                    <div className="flex gap-2 mt-2">
                                        {rec.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">#{t}</span>)}
                                    </div>
                                </div>
                                <button onClick={() => onPlayRecording(rec)} className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors text-zinc-400">
                                    <Icons.Play />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                     <div className="space-y-4">
                        {user.subscriptions.length === 0 && <div className="text-zinc-500 text-center py-10">No subscriptions yet.</div>}
                        {MOCK_PODCASTS.filter(p => user.subscriptions.includes(p.id)).map(sub => (
                            <div key={sub.id} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${sub.coverColor}`}></div>
                                <div>
                                    <h4 className="text-white font-bold">{sub.title}</h4>
                                    <p className="text-xs text-zinc-500">{sub.host}</p>
                                </div>
                            </div>
                        ))}
                     </div>
                )}
            </div>
        </div>
    );
};

// 4. Main Layout & Player
const App = () => {
  const [activeTab, setActiveTab] = useState<"discover" | "studio" | "profile">("discover");
  const [user, setUser] = useState<User>({ name: "Guest User", avatarUrl: "", subscriptions: [], history: [] });
  const [myRecordings, setMyRecordings] = useState<Recording[]>([]);
  
  // Player State
  const [currentTrack, setCurrentTrack] = useState<{ title: string, subtitle: string, duration: string, isRecording: boolean, url?: string, startTime?: number, endTime?: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play standard episode
  const playEpisode = (ep: Episode, podcastTitle: string) => {
    setCurrentTrack({
        title: ep.title,
        subtitle: podcastTitle,
        duration: ep.duration,
        isRecording: false,
        url: ep.audioUrl
    });
    setIsPlaying(true);
  };

  // Play user recording with trim support
  const playRecording = (rec: Recording) => {
      setCurrentTrack({
          title: rec.title,
          subtitle: "My Recording",
          duration: `${Math.floor(rec.durationSec / 60)}:${(rec.durationSec % 60).toString().padStart(2, '0')}`,
          isRecording: true,
          url: rec.blobUrl,
          startTime: rec.trimStart,
          endTime: rec.trimEnd
      });
      setIsPlaying(true);
  };

  useEffect(() => {
    if (currentTrack?.url && audioRef.current) {
        audioRef.current.src = currentTrack.url;
        if (currentTrack.startTime) {
            audioRef.current.currentTime = currentTrack.startTime;
        }
        audioRef.current.play();
    }
  }, [currentTrack]);

  useEffect(() => {
      if (audioRef.current) {
          if (isPlaying) audioRef.current.play();
          else audioRef.current.pause();
      }
  }, [isPlaying]);

  // Enforce trim end
  const handleTimeUpdate = () => {
      if (audioRef.current && currentTrack?.endTime) {
          if (audioRef.current.currentTime >= currentTrack.endTime) {
              audioRef.current.pause();
              setIsPlaying(false);
              if (currentTrack.startTime) audioRef.current.currentTime = currentTrack.startTime;
          }
      }
  };

  const toggleSubscribe = (id: string) => {
      setUser(prev => {
          if (prev.subscriptions.includes(id)) {
              return { ...prev, subscriptions: prev.subscriptions.filter(s => s !== id) };
          } else {
              return { ...prev, subscriptions: [...prev.subscriptions, id] };
          }
      });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 font-sans selection:bg-indigo-500/30">
      <main className="max-w-lg mx-auto min-h-screen bg-black md:border-x border-zinc-800 relative shadow-2xl">
        
        {/* Views */}
        {activeTab === "discover" && (
            <Discover 
                podcasts={MOCK_PODCASTS} 
                subscriptions={user.subscriptions}
                onSubscribe={toggleSubscribe}
                onPlay={playEpisode}
            />
        )}
        {activeTab === "studio" && (
            <Studio onSaveRecording={(rec) => {
                setMyRecordings([rec, ...myRecordings]);
                setActiveTab("profile");
            }} />
        )}
        {activeTab === "profile" && (
            <Profile 
                user={user} 
                setUser={setUser} 
                myRecordings={myRecordings}
                onPlayRecording={playRecording}
            />
        )}

        {/* Floating Player */}
        {currentTrack && (
            <div className="fixed bottom-[80px] left-0 right-0 max-w-lg mx-auto px-4 animate-slide-up z-40">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-3 rounded-2xl flex items-center justify-between shadow-2xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                           <Icons.Play />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-white text-sm truncate">{currentTrack.title}</h4>
                            <p className="text-xs text-zinc-400 truncate">{currentTrack.subtitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            {isPlaying ? <Icons.Pause /> : <Icons.Play />}
                        </button>
                    </div>
                </div>
                <audio 
                    ref={audioRef} 
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                />
            </div>
        )}

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-black border-t border-zinc-800 px-6 py-4 flex justify-between items-center z-50">
            <button 
                onClick={() => setActiveTab("discover")}
                className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === "discover" ? "text-white" : "text-zinc-600"}`}
            >
                <Icons.Home />
                <span className="text-[10px] font-medium">Discover</span>
            </button>
            <button 
                onClick={() => setActiveTab("studio")}
                className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === "studio" ? "text-indigo-500" : "text-zinc-600"}`}
            >
                <Icons.Mic />
                <span className="text-[10px] font-medium">Studio</span>
            </button>
            <button 
                onClick={() => setActiveTab("profile")}
                className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === "profile" ? "text-white" : "text-zinc-600"}`}
            >
                <Icons.User />
                <span className="text-[10px] font-medium">Profile</span>
            </button>
        </nav>

      </main>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);