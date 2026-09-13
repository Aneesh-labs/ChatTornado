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
        ref.current.style.transform = `rotateY(${angle}deg) rotateX(${Math.sin(angle*0.3)*5}deg)`;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e) => {
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawing.current = false; };

  const save = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        className="border border-white/20 rounded-lg touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 bg-violet-500/30 text-white rounded text-sm">Send drawing</button>
        <button onClick={onClose} className="px-3 py-1 bg-white/5 text-white rounded text-sm">Close</button>
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
    setMessages(initialMessages);
    setTyping(initialTyping);
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
      if (e.key === "Escape") handleClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setShowSearch(!showSearch); }
      if (e.key === 'Tab' && aiSuggestions.length > 0) {
        e.preventDefault();
        setInput(aiSuggestions[0]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showSearch, aiSuggestions]);

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

  // --- Self-destruct timers (simplified) ---
  useEffect(() => {
    const timers = messages.map(msg => {
      if (msg.selfDestruct && msg.selfDestruct > 0) {
        const interval = setInterval(() => {
          setMessages(prev => prev.map(m => {
            if (m.id === msg.id && m.selfDestruct > 0) {
              const newTime = m.selfDestruct - 1;
              if (newTime <= 0) return null;
              return { ...m, selfDestruct: newTime };
            }
            return m;
          }).filter(Boolean));
        }, 1000);
        return interval;
      }
      return null;
    }).filter(Boolean);
    return () => timers.forEach(clearInterval);
  }, [messages]);

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

    if (!text) {
      debug('No text to send');
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

    const newMsg = {
      id: Date.now(),
      text,
      senderId: myUserId.current,
      timestamp: new Date().toLocaleTimeString(),
      reactions: {},
      read: false,
      selfDestruct: selfDestructTimer > 0 ? selfDestructTimer : null,
      isBurn: burnAfterReading,
      drawing: drawingData || null,
    };

    setMessages(prev => [...prev, newMsg]);
    if (!firstMessageSent) {
      setFirstMessageSent(true);
      // Confetti effect handled by a ref, but we’ll keep it simple
      if (scrollRef.current) {
        const container = scrollRef.current.closest('.fixed');
        if (container) fireConfetti(container);
      }
    }
    playSound('send', muted);
    setInput('');
    setDrawingData(null);
    handleStopTyping();

    socket.send(JSON.stringify({
      type: "ghost_message",
      receiver_id: currentUser.id,
      message: text,
      selfDestruct: selfDestructTimer,
      burn: burnAfterReading,
      drawing: drawingData,
    }));
  }, [input, socket, currentUser, isConnected, selfDestructTimer, burnAfterReading, firstMessageSent, muted, drawingData]);

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
    // Optionally, you can set connected true here for testing if server doesn't respond
    // setIsConnected(true);
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

  // --- Reactions ---
  const handleReaction = useCallback((msgId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const newReactions = { ...m.reactions };
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
        return { ...m, reactions: newReactions };
      }
      return m;
    }));
  }, []);

  // --- Edit/Delete ---
  const handleEdit = useCallback((msgId, newText) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId && m.senderId === myUserId.current) {
        return { ...m, text: newText };
      }
      return m;
    }));
  }, []);

  const handleDelete = useCallback((msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
  }, []);

  // --- Toggles ---
  const toggleBurn = useCallback(() => setBurnAfterReading(prev => !prev), []);
  const toggleGhostMode = useCallback(() => setGhostMode(prev => prev === 'friendly' ? 'scary' : 'friendly'), []);

  // --- Handle drawing save ---
  const handleDrawingSave = (dataUrl) => {
    setDrawingData(dataUrl);
    setShowDrawing(false);
  };

  // --- Render helpers ---
  if (!isOpen) return null;

  const receiverName = currentUser?.username || "Unknown";
  const isInvitePending = isInvited && !isConnected && messages.length === 0;
  const filteredMessages = searchQuery
    ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const theme = ghostMode === 'friendly' ? 'violet' : 'red';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed inset-0 z-[100] flex flex-col ${bgColor} overflow-hidden`}
    >
      {/* 3D Holographic Wireframe */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="w-96 h-96 border-2 border-violet-500/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            className="absolute w-72 h-72 border-2 border-blue-500/20 rounded-full"
          />
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute w-48 h-48 border-2 border-pink-500/20 rounded-full"
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
            className="absolute top-0 left-0 right-0 z-20 bg-emerald-500/30 backdrop-blur-xl border-b border-emerald-500/30 py-1.5 text-center text-xs font-medium text-emerald-200"
          >
            👻 Connected — Holographic link established
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ephemeral countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute top-0 left-0 right-0 z-10 bg-white/[0.03] border-b border-white/5 py-1 text-center text-[10px] text-white/20 flex items-center justify-center gap-2"
      >
        <Icon path={ICONS.timer} className="h-3 w-3" />
        Quantum link expires in {Math.floor(ephemeralCountdown / 60)}:{(ephemeralCountdown % 60).toString().padStart(2, '0')}
      </motion.div>

      {/* TOP BAR */}
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-3.5 backdrop-blur-xl sm:px-6 mt-8"
      >
        <div className="flex items-center gap-3">
          <HolographicGhost username={receiverName} isTyping={typing} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white/90 flex items-center gap-1">
                Ghost Chat
                <span className="text-[10px] text-white/20 ml-1">◈ 2030</span>
              </h2>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
                <Icon path={ICONS.shield} className="h-2.5 w-2.5 text-emerald-400/70" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/70">Private</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full ${isConnected ? "bg-emerald-400" : "bg-white/20"}`} />
                {isConnected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />}
              </span>
              <p className="text-[11px] text-white/30">{receiverName}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setMuted(!muted)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <Icon path={muted ? ICONS.mute : ICONS.unmute} className="h-4 w-4" />
          </button>
          <button onClick={toggleGhostMode} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 text-xs">
            {ghostMode === 'friendly' ? '👻' : '💀'}
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <Icon path={ICONS.search} className="h-4 w-4" />
          </button>
          <button onClick={toggleQuantum} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <Icon path={ICONS.quantum} className="h-4 w-4" />
          </button>
          <motion.button
            whileHover={{ rotate: 90 }}
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40"
          >
            <Icon path={ICONS.close} className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]"
          >
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search ghost messages..."
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white/70 placeholder:text-white/20 outline-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitle */}
      <div className="relative z-10 flex items-center justify-center gap-2 py-2.5">
        <Icon path={ICONS.lock} className="h-3 w-3 text-white/15" />
        <p className="text-[10px] font-medium tracking-wider text-white/20 uppercase">Ephemeral • Quantum • 2030</p>
      </div>

      {/* CHAT AREA */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto overscroll-y-contain scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent"
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
            <p className="text-sm text-white/50">{receiverName} invites you to a quantum chat</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: ["0 0 0 0 rgba(139,92,246,0.4)", "0 0 0 15px rgba(139,92,246,0)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              onClick={handleAcceptInvite}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500/40 to-indigo-500/30 px-6 py-3 text-sm font-semibold text-violet-200 backdrop-blur-sm"
            >
              <Icon path={ICONS.check} className="h-4 w-4" />
              Enter the Hologram
            </motion.button>
          </motion.div>
        )}

        {!isInvitePending && filteredMessages.length === 0 && !isConnected && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8">
            <div className="text-6xl opacity-10">👻</div>
            <p className="text-sm text-white/20">Awaiting ghost connection...</p>
          </div>
        )}

        <div className="pb-4 pt-2">
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`flex ${msg.senderId === myUserId.current ? "justify-end" : "justify-start"} px-4 py-1`}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-lg backdrop-blur-sm
                  ${msg.senderId === myUserId.current
                    ? `bg-gradient-to-br from-${theme}-500/30 to-indigo-500/20 text-white/90 rounded-br-md border border-white/10`
                    : 'bg-white/5 text-white/80 rounded-bl-md border border-white/5 backdrop-blur-sm'
                  }`}
                >
                  {msg.drawing && (
                    <img src={msg.drawing} alt="drawing" className="max-w-[200px] rounded-md mb-2" />
                  )}
                  <span>{msg.text}</span>
                  {Object.entries(msg.reactions || {}).map(([emoji, count]) => (
                    <span key={emoji} className="text-xs ml-1">{emoji}{count > 1 ? count : ''}</span>
                  ))}
                  {hoveredMsgId === msg.id && (
                    <div className="absolute -top-6 right-0 flex gap-1">
                      <button onClick={() => handleReaction(msg.id, '👻')} className="text-xs bg-white/10 rounded px-1">👻</button>
                      <button onClick={() => handleReaction(msg.id, '💀')} className="text-xs bg-white/10 rounded px-1">💀</button>
                      {msg.senderId === myUserId.current && (
                        <>
                          <button onClick={() => { setEditingMsgId(msg.id); setEditValue(msg.text); }} className="text-xs bg-white/10 rounded px-1">✏️</button>
                          <button onClick={() => handleDelete(msg.id)} className="text-xs bg-white/10 rounded px-1">🗑️</button>
                        </>
                      )}
                    </div>
                  )}
                  {msg.selfDestruct > 0 && (
                    <span className="text-[10px] text-white/20 ml-2">⏳{msg.selfDestruct}s</span>
                  )}
                  {msg.isBurn && <span className="text-[10px] text-red-400/50 ml-2">🔥</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && <TypingIndicator speed={typingSpeed} />}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 border-t border-white/[0.06] bg-white/[0.02] px-4 py-3 backdrop-blur-xl sm:px-6"
      >
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            className="h-11 w-11 flex-shrink-0 rounded-2xl bg-white/5 text-white/30 hover:bg-white/10 flex items-center justify-center"
          >
            <Icon path={ICONS.sticker} className="h-5 w-5" />
          </button>
          {ENABLE_VOICE && (
            <button
              onClick={toggleRecording}
              className={`h-11 w-11 flex-shrink-0 rounded-2xl bg-white/5 text-white/30 hover:bg-white/10 flex items-center justify-center ${isRecording ? 'text-red-400 animate-pulse' : ''}`}
            >
              <Icon path={ICONS.mic} className="h-5 w-5" />
            </button>
          )}
          {ENABLE_DRAWING && (
            <button
              onClick={() => setShowDrawing(!showDrawing)}
              className="h-11 w-11 flex-shrink-0 rounded-2xl bg-white/5 text-white/30 hover:bg-white/10 flex items-center justify-center"
            >
              <Icon path={ICONS.draw} className="h-5 w-5" />
            </button>
          )}
          <div className="relative flex-1">
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
              placeholder="Message in the quantum void..."
              disabled={!isConnected || isInvitePending}
              rows={1}
              className="w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 outline-none transition focus:border-white/[0.15] focus:bg-white/[0.06] disabled:opacity-40"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            {aiSuggestions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 flex gap-1 flex-wrap">
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-[10px] bg-violet-500/20 text-violet-200 px-2 py-0.5 rounded-full hover:bg-violet-500/30 transition"
                  >
                    🤖 {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setSelfDestructTimer(prev => prev === 0 ? 10 : 0)}
            className={`h-11 w-11 flex-shrink-0 rounded-2xl ${selfDestructTimer > 0 ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-white/30'} flex items-center justify-center`}
          >
            <Icon path={ICONS.timer} className="h-5 w-5" />
          </button>
          <button
            onClick={toggleBurn}
            className={`h-11 w-11 flex-shrink-0 rounded-2xl ${burnAfterReading ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/30'} flex items-center justify-center`}
          >
            <Icon path={ICONS.burn} className="h-5 w-5" />
          </button>
          {/* SEND BUTTON — no disabled prop, we handle via onClick alerts */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSend()}
            className="h-11 w-11 flex-shrink-0 rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-400/20 text-violet-300 shadow-lg backdrop-blur-sm flex items-center justify-center hover:opacity-80 transition"
          >
            <Icon path={ICONS.send} className="h-5 w-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* Drawing Modal */}
      {showDrawing && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center">
          <div className="bg-white/10 p-4 rounded-xl border border-white/10">
            <DrawingPad onSave={handleDrawingSave} onClose={() => setShowDrawing(false)} />
          </div>
        </div>
      )}

      {/* Sticker Picker */}
      <AnimatePresence>
        {showStickerPicker && (
          <div className="absolute bottom-20 left-4 bg-white/10 backdrop-blur rounded-xl p-2 border border-white/10 grid grid-cols-3 gap-1 z-30">
            {['👻','💀','🎃','🕷️','🕸️','🧟'].map(s => (
              <button key={s} onClick={() => { setInput(prev => prev + s); setShowStickerPicker(false); }} className="text-3xl hover:scale-125 transition">
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