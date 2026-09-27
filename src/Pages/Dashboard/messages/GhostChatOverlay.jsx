import React, {
  useState, useRef, useEffect, useCallback, useMemo
} from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";

/* ==========================================================================
   CONFIG — change these to match your environment
   ========================================================================== */
const ASSET_BASE_URL = "/uploads"; // e.g. "https://yourdomain.com/uploads"
const ENABLE_VOICE = true;
const ENABLE_DRAWING = true;
const ENABLE_AI_REPLIES = true;
const ENABLE_QUANTUM = true;
const ENABLE_MOOD_BG = true;
const DEBUG = true; // set to false to silence logs

/* ==========================================================================
   ICONS — SVG stroke icons (Lucide-style)
   ========================================================================== */
const Icon = ({ path, className = "h-5 w-5" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const ICONS = {
  ghost: "M9.348 14.652a3.653 3.653 0 010-5.304m5.304 0a3.653 3.653 0 010 5.304m-8.41-6.91A5.97 5.97 0 0112 6.82a5.97 5.97 0 014.758 2.518M3.75 12a8.25 8.25 0 1116.5 0 8.25 8.25 0 01-16.5 0z",
  close: "M6 18L18 6M6 6l12 12",
  send: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25v-6.75a2.25 2.25 0 012.25-2.25z",
  check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  typing: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5",
  shield: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  search: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  reply: "M12 20.25L4.5 16.5l7.5-3.75 7.5 3.75-7.5 3.75z m0 0V12m0 0L4.5 8.25l7.5-3.75 7.5 3.75L12 12z",
  mute: "M12 6v12m-6-6h12",
  unmute: "M12 6v12m-6-6h12 M3 3l18 18",
  edit: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
  delete: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0",
  sticker: "M12 21a9 9 0 100-18 9 9 0 000 18z M9 10h.01M15 10h.01M12 14.5a3.5 3.5 0 01-2.5-1.5",
  timer: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  burn: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z",
  mic: "M12 18a6 6 0 006-6V8a6 6 0 10-12 0v4a6 6 0 006 6zm0 0v4m-6 0h12",
  draw: "M15 15l-2 2 4 4 2-2-4-4z M9 9l-2 2 4 4 2-2-4-4z",
  quantum: "M12 3v18M3 12h18M6.5 6.5l11 11M17.5 6.5l-11 11",
  ai: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a2 2 0 110 4 2 2 0 010-4zm0 6a4 4 0 100 8 4 4 0 000-8z",
  hologram: "M3 12h18M3 6h18M3 18h18M12 3v18M6 6l12 12M18 6L6 18",
  back: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18",
  plus: "M12 4.5v15m7.5-7.5h-15",
  image: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
};

/* ==========================================================================
   DEBUG LOGGER
   ========================================================================== */
const debug = (...args) => {
  if (DEBUG) console.log('[GhostChat]', ...args);
};

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */

// Sentiment analysis (basic)
const getSentiment = (text) => {
  const positive = ["love", "good", "great", "nice", "cool", "awesome", "happy", "yes", "thanks"];
  const negative = ["hate", "bad", "terrible", "awful", "sad", "angry", "upset", "no", "stupid"];
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  words.forEach(w => {
    if (positive.includes(w)) score++;
    if (negative.includes(w)) score--;
  });
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
};

// Sound effects (Web Audio)
let audioCtx = null;
const playSound = (type, muted) => {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.value = 0.06;
    if (type === 'send') {
      osc.frequency.value = 800;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'receive') {
      osc.frequency.value = 600;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'typing') {
      osc.frequency.value = 400;
      osc.start();
      osc.stop(audioCtx.currentTime + 0.02);
    }
  } catch (e) { /* silent fail */ }
};

// Vibrate (mobile)
const vibrate = (pattern) => {
  if (navigator.vibrate) navigator.vibrate(pattern);
};

// Deterministic ghost color
const getGhostColor = (id) => {
  const hash = String(id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue = (hash * 37) % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Confetti (canvas)
const fireConfetti = (container) => {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '50';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = container.offsetWidth;
  canvas.height = container.offsetHeight;
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    size: 8 + Math.random() * 12,
    speed: 2 + Math.random() * 3,
    rotation: Math.random() * 360,
    color: `hsl(${Math.random() * 60 + 280}, 80%, 60%)`,
  }));
  let frame;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.y += p.speed;
      p.rotation += 2;
      if (p.y < canvas.height + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.fillText('👻', 0, 0);
      ctx.restore();
    });
    if (alive) {
      frame = requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  };
  animate();
  setTimeout(() => {
    if (frame) cancelAnimationFrame(frame);
    canvas.remove();
  }, 3000);
};

/* ==========================================================================
   SUBCOMPONENTS
   ========================================================================== */

// --- Holographic Ghost Avatar (3D) ---
const HolographicGhost = ({ username, isTyping }) => {
  const ref = useRef(null);
  useEffect(() => {
    let angle = 0;
    const interval = setInterval(() => {
      if (ref.current) {
        angle += 0.5;
        ref.current.style.transform = `rotateY(${angle}deg) rotateX(${Math.sin(angle * 0.3) * 5}deg)`;
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);
  return (
    <div ref={ref} className="w-12 h-12 relative perspective-500">
      <div className="absolute inset-0 flex items-center justify-center text-4xl text-violet-300/60 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
        👻
        {isTyping && (
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="absolute -bottom-2 text-[10px] text-white/30"
          >
            ✦
          </motion.span>
        )}
      </div>
    </div>
  );
};

// --- Typing Indicator ---
const TypingIndicator = ({ speed = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    className="flex items-center gap-2 px-4 py-2"
  >
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          className="h-2 w-2 rounded-full bg-violet-400/60 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
        />
      ))}
    </div>
    <span className="text-[11px] font-medium text-white/30">ghost typing</span>
    {speed > 0 && <span className="text-[10px] text-white/20">{Math.floor(speed)} WPM</span>}
  </motion.div>
);

// --- Reaction Picker ---
const ReactionPicker = ({ onSelect, onClose }) => {
  const emojis = ['👻', '💀', '👀', '😱', '🙈', '👽', '🤖', '💩'];
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="absolute -top-12 left-0 flex gap-1 rounded-xl bg-white/10 p-1.5 backdrop-blur-md border border-white/10 shadow-xl z-20"
      onMouseLeave={onClose}
    >
      {emojis.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }} className="hover:scale-125 transition text-lg">
          {e}
        </button>
      ))}
    </motion.div>
  );
};

// --- Sticker Picker ---
const StickerPicker = ({ onSelect, onClose }) => {
  const stickers = ['👻', '🧟', '🎃', '🕷️', '🕸️', '💀'];
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="absolute bottom-16 left-0 grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-2 backdrop-blur-md border border-white/10 shadow-xl z-20"
      onMouseLeave={onClose}
    >
      {stickers.map(s => (
        <button key={s} onClick={() => { onSelect(s); onClose(); }} className="text-3xl hover:scale-125 transition">
          {s}
        </button>
      ))}
    </motion.div>
  );
};

// --- Drawing Pad ---
const DrawingPad = ({ onSave, onClose }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const [selectedColor, setSelectedColor] = useState('#a78bfa');
  const [brushSize, setBrushSize] = useState(3);

  const colors = ['#a78bfa', '#22d3ee', '#4ade80', '#f87171', '#fbbf24', '#ffffff'];

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0c0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    if (e.touches) e.preventDefault();
    isDrawing.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    if (e.touches) e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const save = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Palette & Brush Sizes */}
      <div className="flex items-center justify-between w-full px-1">
        {/* Colors */}
        <div className="flex items-center gap-2">
          {colors.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'}`}
              title={c}
            />
          ))}
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
          {[2, 4, 8].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setBrushSize(s)}
              className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${brushSize === s ? 'bg-violet-500 text-white' : 'text-white/50 hover:text-white'}`}
            >
              {s === 2 ? 'Thin' : s === 4 ? 'Med' : 'Thick'}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-inner w-full flex justify-center bg-[#0c0d14]">
        <canvas
          ref={canvasRef}
          width={340}
          height={220}
          className="touch-none cursor-crosshair w-full max-w-[340px] h-[220px]"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between w-full gap-2 mt-1">
        <button
          type="button"
          onClick={initCanvas}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-xs font-medium border border-white/10 transition-all active:scale-95"
        >
          Clear
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-xl text-xs font-medium active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all"
          >
            Attach Drawing
          </button>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN GHOST CHAT OVERLAY
   ========================================================================== */
const GhostChatOverlay = ({ ghostChat, socket, onClose }) => {
  // --- Destructure props with safe defaults ---
  const {
    open = false,
    connected = false,
    invited = false,
    user = null,
    messages: initialMessages = [],
    typing: initialTyping = false,
  } = ghostChat || {};

  // --- Core state ---
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [typing, setTyping] = useState(initialTyping);
  const [isConnected, setIsConnected] = useState(connected);
  const [isInvited, setIsInvited] = useState(invited);
  const [currentUser, setCurrentUser] = useState(user);
  const [isOpen, setIsOpen] = useState(open);

  // --- Feature toggles state ---
  const [muted, setMuted] = useState(false);
  const [ghostMode, setGhostMode] = useState('friendly');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selfDestructTimer, setSelfDestructTimer] = useState(0);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [ephemeralCountdown, setEphemeralCountdown] = useState(300);
  const [draft, setDraft] = useState('');
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  const [reactions, setReactions] = useState({});
  const [readReceipts, setReadReceipts] = useState({});
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(0);
  const [lastTypingTime, setLastTypingTime] = useState(Date.now());
  const [isRecording, setIsRecording] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [quantumMode, setQuantumMode] = useState(false);
  const [sentiment, setSentiment] = useState('neutral');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [showConnected, setShowConnected] = useState(false);
  const [drawingData, setDrawingData] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [showTools, setShowTools] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);

  // Refs
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  // User ID fallback
  const myUserId = useRef(
    sessionStorage.getItem("userId") ||
    localStorage.getItem("userId") ||
    'guest_' + Math.random().toString(36).substr(2, 6)
  );

  // --- DEBUG: log props on mount ---
  useEffect(() => {
    debug('Component mounted with props:', { ghostChat, socket: socket?.readyState });
  }, []);

  // --- Update state when props change ---
  useEffect(() => {
    setIsConnected(connected);
    setIsInvited(invited);
    setCurrentUser(user);
    setIsOpen(open);
    setTyping(initialTyping);

    if (initialMessages && initialMessages.length > 0) {
      setMessages(prev => {
        const prevMap = new Map(prev.map(m => [String(m.id), m]));
        initialMessages.forEach(im => {
          const idStr = String(im.id);
          if (prevMap.has(idStr)) {
            const existing = prevMap.get(idStr);
            prevMap.set(idStr, {
              ...im,
              ...existing,
              reactions: { ...(im.reactions || {}), ...(existing.reactions || {}) }
            });
          } else {
            prevMap.set(idStr, im);
          }
        });
        return Array.from(prevMap.values());
      });
    }
  }, [connected, invited, user, open, initialMessages, initialTyping]);

  // --- Draft persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('ghostDraft');
    if (saved) setDraft(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem('ghostDraft', input);
  }, [input]);

  // --- Scroll to bottom ---
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // --- Connected flash ---
  useEffect(() => {
    if (isConnected) {
      setShowConnected(true);
      const timer = setTimeout(() => setShowConnected(false), 1500);
      return () => clearTimeout(timer);
    }
    setShowConnected(false);
  }, [isConnected]);

  // --- Focus input ---
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 350);
  }, [isOpen]);

  // --- Body lock ---
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (previewMedia) {
          setPreviewMedia(null);
        } else {
          handleClose();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowSearch(!showSearch); }
      if (e.key === 'Tab' && aiSuggestions.length > 0) {
        e.preventDefault();
        setInput(aiSuggestions[0]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showSearch, aiSuggestions, previewMedia]);

  // --- Ephemeral countdown ---
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setEphemeralCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // --- Unified Self-Destruct & Burn-on-Read Timers ---
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => {
        let changed = false;
        const updated = prev.map(m => {
          // 1. Self-destruct message timer
          if (m.selfDestruct && m.selfDestruct > 0) {
            changed = true;
            const nextSec = m.selfDestruct - 1;
            if (nextSec <= 0) return null;
            return { ...m, selfDestruct: nextSec };
          }
          // 2. Active Burn-on-read countdown
          if (m.burningCountdown && m.burningCountdown > 0) {
            changed = true;
            const nextBurn = m.burningCountdown - 1;
            if (nextBurn <= 0) {
              if (socket?.readyState === WebSocket.OPEN && currentUser?.id) {
                socket.send(JSON.stringify({
                  type: "ghost_burn",
                  receiver_id: currentUser.id,
                  message_id: m.id
                }));
              }
              return null;
            }
            return { ...m, burningCountdown: nextBurn };
          }
          return m;
        }).filter(Boolean);

        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [socket, currentUser]);

  // --- Voice recognition ---
  useEffect(() => {
    if (!ENABLE_VOICE) return;
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        debug('Voice recognition error:', e);
      }
    }
  };

  // --- AI replies (mock) ---
  const generateAIReplies = (text) => {
    if (!ENABLE_AI_REPLIES) return [];
    const replies = [
      "That's interesting!",
      "Tell me more about that.",
      "I agree with you.",
      "I hadn't thought of that.",
      "Let's explore that idea.",
      "That makes sense.",
      "I'm not sure I follow.",
      "Could you elaborate?",
    ];
    return replies.slice(0, 3);
  };

  useEffect(() => {
    if (input.length > 3) {
      setAiSuggestions(generateAIReplies(input));
    } else {
      setAiSuggestions([]);
    }
  }, [input]);

  // --- Mood background ---
  const bgColor = useMemo(() => {
    if (!ENABLE_MOOD_BG) return 'bg-[#08080f]';
    if (sentiment === 'positive') return 'bg-gradient-to-br from-emerald-900/30 to-cyan-900/30';
    if (sentiment === 'negative') return 'bg-gradient-to-br from-red-900/30 to-rose-900/30';
    return 'bg-[#08080f]';
  }, [sentiment]);

  // --- Quantum shuffle ---
  const toggleQuantum = () => setQuantumMode(prev => !prev);
  useEffect(() => {
    if (quantumMode) {
      setMessages(prev => [...prev].sort(() => Math.random() - 0.5));
    }
  }, [quantumMode]);

  // --- SEND MESSAGE (with debug and alerts) ---
  const handleSend = useCallback((customText) => {
    const text = (customText || input).trim();
    debug('Send clicked', { text, socketReady: socket?.readyState, isConnected, currentUser });

    if (!text && !drawingData && !imageData) {
      debug('No text or media to send');
      return;
    }
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      debug('Socket not open');
      alert('Cannot send – socket is not connected. Please check your connection.');
      return;
    }
    if (!isConnected) {
      debug('Not connected to peer');
      alert('You are not connected to the other user yet.');
      return;
    }
    if (!currentUser?.id) {
      debug('No receiver user ID');
      alert('No user ID – cannot send.');
      return;
    }

    // Update sentiment
    if (ENABLE_MOOD_BG) setSentiment(getSentiment(text));

    const msgId = Date.now();
    const newMsg = {
      id: msgId,
      text,
      senderId: myUserId.current,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: {},
      read: false,
      selfDestruct: selfDestructTimer > 0 ? selfDestructTimer : null,
      isBurn: burnAfterReading,
      revealed: true, // Sender has already seen what they typed
      drawing: drawingData || null,
      image: imageData || null,
    };

    setMessages(prev => [...prev, newMsg]);
    if (!firstMessageSent) {
      setFirstMessageSent(true);
      if (scrollRef.current) {
        const container = scrollRef.current.closest('.fixed');
        if (container) fireConfetti(container);
      }
    }
    playSound('send', muted);
    setInput('');
    setDrawingData(null);
    setImageData(null);
    handleStopTyping();

    socket.send(JSON.stringify({
      type: "ghost_message",
      id: msgId,
      receiver_id: currentUser.id,
      message: text,
      selfDestruct: selfDestructTimer,
      burn: burnAfterReading,
      drawing: drawingData,
      image: imageData,
    }));
  }, [input, socket, currentUser, isConnected, selfDestructTimer, burnAfterReading, firstMessageSent, muted, drawingData, imageData]);

  // --- Typing handlers ---
  const handleTyping = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !isConnected || !currentUser?.id) return;
    socket.send(JSON.stringify({ type: "ghost_typing", receiver_id: currentUser.id }));

    const now = Date.now();
    const diff = now - lastTypingTime;
    if (diff < 200) {
      setTypingSpeed(prev => Math.min(prev + 10, 100));
    } else {
      setTypingSpeed(prev => Math.max(prev - 5, 0));
    }
    setLastTypingTime(now);
    playSound('typing', muted);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 2000);
  }, [socket, currentUser, isConnected, lastTypingTime, muted]);

  const handleStopTyping = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !isConnected || !currentUser?.id) return;
    socket.send(JSON.stringify({ type: "ghost_stop_typing", receiver_id: currentUser.id }));
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [socket, currentUser, isConnected]);

  // --- Input change ---
  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInput(val);
    handleTyping();
  }, [handleTyping]);

  // --- Accept invite (with debug and alerts) ---
  const handleAcceptInvite = useCallback(() => {
    debug('Accept invite clicked', { socketReady: socket?.readyState, currentUser });
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      alert('Cannot accept – socket is not ready.');
      return;
    }
    if (!currentUser?.id) {
      alert('No user ID – cannot accept invite.');
      return;
    }
    socket.send(JSON.stringify({ type: "ghost_accept", receiver_id: currentUser.id }));
  }, [socket, currentUser]);

  // --- Close ---
  const handleClose = useCallback(() => {
    debug('Close clicked');
    if (socket && socket.readyState === WebSocket.OPEN && currentUser?.id) {
      socket.send(JSON.stringify({ type: "ghost_close", receiver_id: currentUser.id }));
    }
    setInput("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onClose();
  }, [socket, currentUser, onClose]);

  // --- Reveal Burn-on-Read Message ---
  const handleRevealBurn = useCallback((msgId) => {
    playSound('typing', muted);
    setMessages(prev => prev.map(m => {
      if (String(m.id) === String(msgId)) {
        return {
          ...m,
          revealed: true,
          burningCountdown: 5 // 5 seconds burn countdown
        };
      }
      return m;
    }));
  }, [muted]);

  // --- Reactions ---
  const handleReaction = useCallback((msgId, emoji) => {
    playSound('receive', muted);
    setMessages(prev => prev.map(m => {
      if (String(m.id) === String(msgId)) {
        const newReactions = { ...(m.reactions || {}) };
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
        return { ...m, reactions: newReactions };
      }
      return m;
    }));
    if (socket?.readyState === WebSocket.OPEN && currentUser?.id) {
      socket.send(JSON.stringify({
        type: "ghost_reaction",
        receiver_id: currentUser.id,
        message_id: msgId,
        emoji
      }));
    }
  }, [socket, currentUser, muted]);

  // --- Edit/Delete ---
  const handleEdit = useCallback((msgId, newText) => {
    setMessages(prev => prev.map(m => {
      if (String(m.id) === String(msgId) && String(m.senderId) === String(myUserId.current)) {
        return { ...m, text: newText };
      }
      return m;
    }));
  }, []);

  const handleDelete = useCallback((msgId) => {
    setMessages(prev => prev.filter(m => String(m.id) !== String(msgId)));
    if (socket?.readyState === WebSocket.OPEN && currentUser?.id) {
      socket.send(JSON.stringify({
        type: "ghost_delete",
        receiver_id: currentUser.id,
        message_id: msgId
      }));
    }
  }, [socket, currentUser]);

  // --- Toggles ---
  const toggleBurn = useCallback(() => setBurnAfterReading(prev => !prev), []);
  const toggleGhostMode = useCallback(() => setGhostMode(prev => prev === 'friendly' ? 'scary' : 'friendly'), []);

  // --- Handle drawing save ---
  const handleDrawingSave = (dataUrl) => {
    setDrawingData(dataUrl);
    setShowDrawing(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImageData(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // --- Render helpers ---
  if (!isOpen) return null;

  const receiverName = currentUser?.username || "Unknown";
  const isInvitePending = isInvited && !isConnected && messages.length === 0;
  const filteredMessages = searchQuery
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const theme = ghostMode === 'friendly' ? 'violet' : 'red';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed inset-0 z-[100] flex flex-col ${bgColor} overflow-hidden h-[100dvh] pb-safe select-none`}
    >
      {/* 3D Holographic Wireframe */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="w-72 sm:w-96 h-72 sm:h-96 border-2 border-violet-500/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            className="absolute w-56 sm:w-72 h-56 sm:h-72 border-2 border-blue-500/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute w-36 sm:w-48 h-36 sm:h-48 border-2 border-pink-500/20 rounded-full"
          />
        </div>
      </div>

      {/* Floating particles (from messages) */}
      <div className="absolute inset-0 pointer-events-none">
        {messages.slice(-3).map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, scale: 0, x: Math.random() * 100 - 50, y: Math.random() * 100 - 50 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: 2, delay: i * 0.3 }}
            className="absolute text-2xl text-violet-400/20"
            style={{ left: Math.random() * 80 + 10 + '%', top: Math.random() * 80 + 10 + '%' }}
          >
            ✦
          </motion.div>
        ))}
      </div>

      {/* Connection status bar */}
      <AnimatePresence>
        {showConnected && (
          <motion.div
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            exit={{ y: -60 }}
            className="absolute top-0 left-0 right-0 z-30 bg-emerald-500/30 backdrop-blur-xl border-b border-emerald-500/30 py-1.5 text-center text-xs font-medium text-emerald-200"
          >
            👻 Connected — Holographic quantum link established
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 flex items-center justify-between border-b border-white/[0.08] bg-black/40 backdrop-blur-2xl px-3 sm:px-6 py-2.5 sm:py-3 pt-safe"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 -ml-1 sm:hidden rounded-xl text-white/70 hover:bg-white/10 active:scale-95 transition-transform flex items-center justify-center"
            aria-label="Back to main chat"
          >
            <Icon path={ICONS.back} className="h-5 w-5" />
          </button>
          <HolographicGhost username={receiverName} isTyping={typing} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-white/90 truncate">
                Ghost Chat
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 sm:px-2 sm:py-0.5 flex-shrink-0">
                <Icon path={ICONS.shield} className="h-2 w-2 text-emerald-400" />
                <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-emerald-400">RAM-ONLY P2P</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/40 truncate">
              <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                <span className={`absolute inline-flex h-full w-full rounded-full ${isConnected ? "bg-emerald-400" : "bg-white/20"}`} />
                {isConnected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />}
              </span>
              <span className="truncate">{receiverName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Ephemeral countdown timer badge */}
          <div
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-mono transition-all ${
              ephemeralCountdown < 60
                ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                : 'bg-white/5 border-white/10 text-violet-300/90'
            }`}
            title="Session self-destruct timer"
          >
            <Icon path={ICONS.timer} className="h-3 w-3 text-violet-400" />
            <span>{Math.floor(ephemeralCountdown / 60)}:{(ephemeralCountdown % 60).toString().padStart(2, '0')}</span>
          </div>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1.5 rounded-xl transition-all active:scale-95 ${showSearch ? 'bg-violet-500/30 text-violet-300 border border-violet-500/30' : 'hover:bg-white/10 text-white/60'}`}
            title="Search ghost messages"
          >
            <Icon path={ICONS.search} className="h-4 w-4" />
          </button>
          <button onClick={() => setMuted(!muted)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 active:scale-95 transition-transform hidden sm:flex" title={muted ? "Unmute" : "Mute"}>
            <Icon path={muted ? ICONS.mute : ICONS.unmute} className="h-4 w-4" />
          </button>
          <button onClick={toggleGhostMode} className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 text-xs active:scale-95 transition-transform hidden sm:flex" title="Toggle mood">
            {ghostMode === 'friendly' ? '👻' : '💀'}
          </button>
          <button onClick={toggleQuantum} className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 active:scale-95 transition-transform hidden sm:flex" title="Quantum shuffle">
            <Icon path={ICONS.quantum} className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 active:scale-95 transition-transform hidden sm:flex"
            title="Exit Ghost Chat"
          >
            <Icon path={ICONS.close} className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Search bar with match count & clear */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search in this ghost session..."
                className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-1.5 text-xs sm:text-sm text-white/90 placeholder:text-white/30 outline-none focus:border-violet-500/50"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="text-[11px] text-violet-300/80 font-mono flex-shrink-0 bg-violet-500/10 px-2 py-1 rounded-lg border border-violet-500/20">
                {filteredMessages.length} match{filteredMessages.length !== 1 ? 'es' : ''}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitle */}
      <div className="relative z-10 flex items-center justify-center gap-2 py-2">
        <Icon path={ICONS.lock} className="h-3 w-3 text-violet-400/40" />
        <p className="text-[10px] font-medium tracking-wider text-white/25 uppercase">Zero Disk Logs • Pure RAM Transmission • Ephemeral</p>
      </div>

      {/* CHAT AREA */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto overscroll-y-contain scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent px-2 sm:px-4"
      >
        {isInvitePending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center gap-6 px-8"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl"
            >
              👻
            </motion.div>
            <p className="text-sm text-white/50 text-center">{receiverName} invites you to an encrypted ghost session</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: ["0 0 0 0 rgba(139,92,246,0.4)", "0 0 0 15px rgba(139,92,246,0)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              onClick={handleAcceptInvite}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500/50 to-indigo-500/40 border border-violet-400/30 px-6 py-3 text-sm font-semibold text-violet-100 shadow-xl backdrop-blur-md"
            >
              <Icon path={ICONS.check} className="h-4 w-4" />
              Enter the Hologram
            </motion.button>
          </motion.div>
        )}

        {!isInvitePending && filteredMessages.length === 0 && !isConnected && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
            <div className="text-6xl opacity-10">👻</div>
            <p className="text-sm text-white/30 font-medium">Awaiting ghost connection...</p>
          </div>
        )}

        <div className="pb-4 pt-2 space-y-3">
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg) => {
              // Exact type-safe string comparison to guarantee distinct left/right alignment
              const isMe = String(msg.senderId) === String(myUserId.current) || msg.senderId === 'me';
              const isActionVisible = (hoveredMsgId === msg.id) || (activeMsgId === msg.id);

              // Burn on Read logic: if receiver hasn't revealed yet
              const isUnrevealedBurn = msg.isBurn && !isMe && !msg.revealed;
              const isBurningNow = msg.burningCountdown > 0;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7, filter: "blur(8px)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"} px-1 sm:px-2 relative`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  {/* Author Header Tag */}
                  <div className={`flex items-center gap-1.5 mb-1 px-1 text-[10px] font-medium tracking-wide ${isMe ? "text-violet-300/70" : "text-cyan-300/70"}`}>
                    <span>{isMe ? "You" : (receiverName || "Ghost Peer")}</span>
                    <span className="text-white/20">•</span>
                    <span className="text-white/30 font-mono">{msg.timestamp || "just now"}</span>
                  </div>

                  <div
                    onClick={() => setActiveMsgId(prev => prev === msg.id ? null : msg.id)}
                    className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed backdrop-blur-xl relative cursor-pointer select-text touch-manipulation transition-all
                      ${isMe
                        ? 'bg-gradient-to-br from-violet-600/35 via-indigo-600/25 to-purple-900/20 text-white border border-violet-500/30 rounded-br-xs shadow-[0_4px_25px_rgba(139,92,246,0.18)]'
                        : 'bg-[#101322]/85 text-white/90 border border-cyan-500/25 rounded-bl-xs shadow-[0_4px_25px_rgba(34,211,238,0.10)]'
                      } ${activeMsgId === msg.id ? 'ring-2 ring-violet-400/60' : ''} ${isBurningNow ? 'border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : ''}`}
                  >
                    {/* Burn-on-Read: Cover screen if unrevealed */}
                    {isUnrevealedBurn ? (
                      <div className="flex flex-col items-center gap-2 py-2 px-1 text-center" onClick={(e) => { e.stopPropagation(); handleRevealBurn(msg.id); }}>
                        <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                          <Icon path={ICONS.burn} className="h-4 w-4 animate-bounce text-amber-400" />
                          <span>Secret Burn-on-Read Message</span>
                        </div>
                        <p className="text-[11px] text-white/50">This message will self-destruct 5 seconds after you tap.</p>
                        <button
                          type="button"
                          className="mt-1 px-3.5 py-1.5 bg-amber-500/30 hover:bg-amber-500/40 border border-amber-400/40 text-amber-200 rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all"
                        >
                          🔥 Tap to Reveal & Burn
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Drawing Attachment */}
                        {msg.drawing && (
                          <div className="relative group mb-2 overflow-hidden rounded-xl border border-white/15 bg-black/40">
                            <img
                              src={msg.drawing}
                              alt="ghost sketch"
                              className="max-w-[240px] sm:max-w-[300px] max-h-[200px] object-contain rounded-xl cursor-zoom-in transition-transform hover:scale-[1.02]"
                              onClick={(e) => { e.stopPropagation(); setPreviewMedia(msg.drawing); }}
                            />
                            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[9px] text-white/60">
                              🔍 Click to zoom
                            </div>
                          </div>
                        )}

                        {/* Image Attachment */}
                        {msg.image && (
                          <div className="relative group mb-2 overflow-hidden rounded-xl border border-white/15 bg-black/40">
                            <img
                              src={msg.image}
                              alt="ghost attachment"
                              className="max-w-[240px] sm:max-w-[300px] max-h-[220px] object-cover rounded-xl cursor-zoom-in transition-transform hover:scale-[1.02]"
                              onClick={(e) => { e.stopPropagation(); setPreviewMedia(msg.image); }}
                            />
                            <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[9px] text-white/60">
                              🔍 Click to zoom
                            </div>
                          </div>
                        )}

                        {/* Message Text or Inline Edit */}
                        {editingMsgId === msg.id ? (
                          <div className="flex flex-col gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full bg-black/60 border border-violet-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-violet-400"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleEdit(msg.id, editValue);
                                  setEditingMsgId(null);
                                } else if (e.key === "Escape") {
                                  setEditingMsgId(null);
                                }
                              }}
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => { handleEdit(msg.id, editValue); setEditingMsgId(null); }}
                                className="px-2 py-0.5 bg-violet-500/40 text-violet-200 hover:bg-violet-500/60 rounded text-[11px] font-medium"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMsgId(null)}
                                className="px-2 py-0.5 bg-white/10 text-white/60 hover:bg-white/20 rounded text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          msg.text && <p className="break-words whitespace-pre-wrap select-text">{msg.text}</p>
                        )}
                      </>
                    )}

                    {/* Reactions Display */}
                    {Object.entries(msg.reactions || {}).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-white/10">
                        {Object.entries(msg.reactions || {}).map(([emoji, count]) => (
                          <span key={emoji} className="inline-flex items-center gap-1 bg-white/10 border border-white/10 rounded-full px-2 py-0.5 text-[11px] shadow-sm">
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-[10px] text-white/70 font-bold">{count}</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Live Badges: Self-destruct & Burn Status */}
                    {(msg.selfDestruct > 0 || msg.isBurn) && (
                      <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/5 text-[10px]">
                        {msg.selfDestruct > 0 && (
                          <span className="flex items-center gap-1 font-mono text-violet-300/90 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                            ⏳ {msg.selfDestruct}s remaining
                          </span>
                        )}
                        {msg.isBurn && (
                          <span className={`flex items-center gap-1 font-semibold ${isBurningNow ? 'text-amber-400 animate-pulse' : 'text-amber-300/80'}`}>
                            🔥 {isBurningNow ? `Disintegrating in ${msg.burningCountdown}s...` : isMe ? 'Burn on read (armed)' : 'Burn on read'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Touch & Hover Action Pill (Reactions, Edit, Delete) */}
                    {isActionVisible && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`absolute -top-9 ${isMe ? 'right-0' : 'left-0'} flex items-center gap-1 bg-[#151728]/95 backdrop-blur-2xl px-2.5 py-1 rounded-2xl border border-white/20 shadow-2xl z-30`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button type="button" onClick={() => { handleReaction(msg.id, '👻'); setActiveMsgId(null); }} className="p-1 text-sm hover:scale-130 transition-transform">👻</button>
                        <button type="button" onClick={() => { handleReaction(msg.id, '💀'); setActiveMsgId(null); }} className="p-1 text-sm hover:scale-130 transition-transform">💀</button>
                        <button type="button" onClick={() => { handleReaction(msg.id, '🔥'); setActiveMsgId(null); }} className="p-1 text-sm hover:scale-130 transition-transform">🔥</button>
                        <button type="button" onClick={() => { handleReaction(msg.id, '❤️'); setActiveMsgId(null); }} className="p-1 text-sm hover:scale-130 transition-transform">❤️</button>
                        <button type="button" onClick={() => { handleReaction(msg.id, '⚡'); setActiveMsgId(null); }} className="p-1 text-sm hover:scale-130 transition-transform">⚡</button>
                        {isMe && (
                          <>
                            <div className="w-[1px] h-3.5 bg-white/20 mx-0.5" />
                            <button
                              type="button"
                              onClick={() => { setEditingMsgId(msg.id); setEditValue(msg.text || ''); setActiveMsgId(null); }}
                              className="p-1 text-xs text-white/70 hover:text-white"
                              title="Edit message"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleDelete(msg.id); setActiveMsgId(null); }}
                              className="p-1 text-xs text-red-400 hover:text-red-300"
                              title="Delete message"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {typing && <TypingIndicator speed={typingSpeed} />}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 border-t border-white/[0.08] bg-black/40 backdrop-blur-2xl px-2.5 sm:px-6 py-2.5 sm:py-3 pb-safe"
      >
        {/* Drawing Staged Preview */}
        {drawingData && (
          <div className="mb-2 flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-xl px-2.5 py-1.5 w-fit shadow-md">
            <img src={drawingData} alt="drawing" className="h-9 w-14 object-cover rounded-lg border border-white/20 bg-black/40" />
            <span className="text-xs text-violet-200 font-medium">Drawing attached</span>
            <button onClick={() => setDrawingData(null)} className="text-white/60 hover:text-white ml-1 text-xs p-1" title="Remove drawing">✕</button>
          </div>
        )}

        {/* Image Staged Preview */}
        {imageData && (
          <div className="mb-2 flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-xl px-2.5 py-1.5 w-fit shadow-md">
            <img src={imageData} alt="attachment" className="h-9 w-14 object-cover rounded-lg border border-white/20 bg-black/40" />
            <span className="text-xs text-violet-200 font-medium">Image attached</span>
            <button onClick={() => setImageData(null)} className="text-white/60 hover:text-white ml-1 text-xs p-1" title="Remove image">✕</button>
          </div>
        )}

        {/* Quick Tools Drawer */}
        <AnimatePresence>
          {showTools && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-x-auto scrollbar-none pb-2 mb-1.5 flex items-center gap-2 touch-manipulation"
            >
              {/* Burn toggle */}
              <button
                type="button"
                onClick={toggleBurn}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${burnAfterReading
                    ? 'bg-amber-500/25 border border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                  }`}
              >
                <Icon path={ICONS.burn} className="h-3.5 w-3.5 text-amber-400" />
                <span>Burn on Read {burnAfterReading ? '✓ (ON)' : '(OFF)'}</span>
              </button>

              {/* Self destruct timer toggle */}
              <button
                type="button"
                onClick={() => setSelfDestructTimer(prev => prev === 0 ? 5 : prev === 5 ? 10 : prev === 10 ? 30 : 0)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${selfDestructTimer > 0
                    ? 'bg-red-500/25 border border-red-500/50 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                  }`}
              >
                <Icon path={ICONS.timer} className="h-3.5 w-3.5 text-red-400" />
                <span>{selfDestructTimer > 0 ? `⏳ ${selfDestructTimer}s Self-Destruct` : 'Timer: OFF'}</span>
              </button>

              {/* Image Upload */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all flex-shrink-0 cursor-pointer hover:bg-white/10">
                <Icon path={ICONS.image} className="h-3.5 w-3.5 text-violet-400" />
                <span>Attach Image</span>
                <input type="file" accept="image/*" onChange={(e) => { handleImageUpload(e); setShowTools(false); }} className="hidden" />
              </label>

              {/* Drawing */}
              {ENABLE_DRAWING && (
                <button
                  type="button"
                  onClick={() => { setShowDrawing(true); setShowTools(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all flex-shrink-0 hover:bg-white/10"
                >
                  <Icon path={ICONS.draw} className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Draw Sketch</span>
                </button>
              )}

              {/* Voice recognition */}
              {ENABLE_VOICE && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0 ${isRecording
                      ? 'bg-red-500/25 border border-red-500/50 text-red-300 animate-pulse'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                    }`}
                >
                  <Icon path={ICONS.mic} className="h-3.5 w-3.5 text-pink-400" />
                  <span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Input Row */}
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Tools toggle button */}
          <button
            type="button"
            onClick={() => setShowTools(prev => !prev)}
            className={`h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-center active:scale-90 ${showTools || burnAfterReading || selfDestructTimer > 0 || drawingData || imageData
                ? 'bg-violet-500/25 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
              }`}
            title="Ghost Chat Tools"
            aria-label="Toggle tools"
          >
            <Icon path={ICONS.plus} className={`h-5 w-5 transition-transform ${showTools ? 'rotate-45' : ''}`} />
          </button>

          {/* Quick sticker button */}
          <button
            type="button"
            onClick={() => setShowStickerPicker(prev => !prev)}
            className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 active:scale-90 transition-all flex items-center justify-center"
            title="Stickers"
            aria-label="Open stickers"
          >
            <Icon path={ICONS.sticker} className="h-5 w-5" />
          </button>

          {/* Textarea Container */}
          <div className="relative flex-1 min-w-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onBlur={handleStopTyping}
              placeholder={isRecording ? "Listening..." : "Message in the quantum void..."}
              disabled={!isConnected || isInvitePending}
              rows={1}
              className="w-full resize-none rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 sm:py-3 text-sm text-white/90 placeholder:text-white/30 outline-none transition focus:border-violet-500/50 focus:bg-white/[0.08] disabled:opacity-40"
              style={{ minHeight: "42px", maxHeight: "110px" }}
            />
            {/* AI Suggestions Chips */}
            {aiSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1.5 flex gap-1 flex-wrap z-10">
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-[10px] bg-violet-500/30 border border-violet-500/40 text-violet-200 px-2 py-0.5 rounded-full hover:bg-violet-500/40 transition shadow-sm"
                  >
                    🤖 {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Send Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSend()}
            disabled={!input.trim() && !drawingData && !imageData}
            className={`h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg backdrop-blur-sm flex items-center justify-center transition-all ${!input.trim() && !drawingData && !imageData ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'
              }`}
            aria-label="Send message"
          >
            <Icon path={ICONS.send} className="h-4 w-4 sm:h-5 sm:w-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* Drawing Modal */}
      {showDrawing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121424] p-5 rounded-2xl border border-white/20 shadow-2xl max-w-md w-full flex flex-col items-center">
            <h3 className="text-xs font-semibold text-white/80 mb-3 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎨</span> Draw Ghost Sketch
            </h3>
            <DrawingPad onSave={handleDrawingSave} onClose={() => setShowDrawing(false)} />
          </div>
        </div>
      )}

      {/* Full-Screen Zoom Media Lightbox */}
      <AnimatePresence>
        {previewMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setPreviewMedia(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={previewMedia}
                alt="Zoomed attachment"
                className="max-w-full max-h-[80vh] rounded-2xl border border-white/20 shadow-2xl object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="absolute -top-10 right-0 p-1 text-white/70 hover:text-white bg-white/10 rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold backdrop-blur-md"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticker Picker */}
      <AnimatePresence>
        {showStickerPicker && (
          <div className="absolute bottom-20 left-3 sm:left-4 bg-[#12121e]/95 backdrop-blur-2xl rounded-2xl p-3 border border-white/15 shadow-2xl grid grid-cols-3 gap-2 z-40 max-w-[240px]">
            {['👻', '💀', '🎃', '🕷️', '🕸️', '🧟'].map(s => (
              <button key={s} type="button" onClick={() => { setInput(prev => prev + s); setShowStickerPicker(false); }} className="text-3xl p-1.5 hover:scale-125 active:scale-95 transition-transform flex items-center justify-center">
                {s}
              </button>
            ))}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ==========================================================================
   PROPTYPES
   ========================================================================== */
GhostChatOverlay.propTypes = {
  ghostChat: PropTypes.shape({
    open: PropTypes.bool.isRequired,
    connected: PropTypes.bool.isRequired,
    invited: PropTypes.bool,
    user: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      username: PropTypes.string,
      avatar: PropTypes.string,
    }),
    messages: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        text: PropTypes.string,
        senderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        timestamp: PropTypes.string,
        reactions: PropTypes.object,
        read: PropTypes.bool,
        selfDestruct: PropTypes.number,
        isBurn: PropTypes.bool,
        isHidden: PropTypes.bool,
        drawing: PropTypes.string,
      })
    ),
    typing: PropTypes.bool,
  }).isRequired,
  socket: PropTypes.instanceOf(WebSocket),
  onClose: PropTypes.func.isRequired,
};

export default GhostChatOverlay;