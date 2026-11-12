import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import { soundEngine } from "../../../utils/soundEffects";
import HiFiGameShell from "../hiFiSuite/HiFiGameShell";
import { generateTarget24Puzzle, isPrimeNumber } from "./megaEngines";

/* ═══════════════════════════════════════════════════════════════════════════
   16. EQUATION FORGE 24 v2.0 (Arithmetic Target Solver)
   ═══════════════════════════════════════════════════════════════════════════ */
export const Target24Game = ({ onBack, isMuted, onSaveScore }) => {
  const [nums, setNums] = useState(() => generateTarget24Puzzle().map((v, i) => ({ id: i, val: v })));
  const [selIdx, setSelIdx] = useState(null);
  const [op, setOp] = useState("+");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("target24_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const newPuzzle = () => { setNums(generateTarget24Puzzle().map((v, i) => ({ id: i, val: v }))); setSelIdx(null); playFx("whoosh"); };

  const pickTile = (idx) => {
    if (selIdx === null) { setSelIdx(idx); return; }
    if (selIdx === idx) { setSelIdx(null); return; }
    const a = nums[selIdx].val;
    const b = nums[idx].val;
    let res = null;
    if (op === "+") res = a + b;
    else if (op === "-") res = a - b;
    else if (op === "×") res = a * b;
    else if (op === "÷" && b !== 0) res = Number((a / b).toFixed(4));
    if (res === null) return;

    const next = nums.filter((_, i) => i !== selIdx && i !== idx);
    next.push({ id: Date.now() + Math.random(), val: res });
    setNums(next);
    setSelIdx(null);
    playFx("laser");

    if (next.length === 1 && Math.abs(next[0].val - 24) < 0.001) {
      const sc = score + 100;
      setScore(sc);
      playFx("win");
      if (sc > highScore) { setHighScore(sc); localStorage.setItem("target24_highscore", String(sc)); onSaveScore?.("target24", sc); }
      setTimeout(newPuzzle, 900);
    }
  };

  return (
    <HiFiGameShell title="Equation Forge 24" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={newPuzzle} controlsHint="Select a number, choose an operator (+ − × ÷), and select a second number to merge toward 24!">
      <div className="flex gap-2">
        {["+", "-", "×", "÷"].map((sym) => (
          <button key={sym} type="button" onClick={() => setOp(sym)} className={`w-12 h-12 rounded-xl font-black text-lg border cursor-pointer ${op === sym ? "bg-amber-400 text-black border-white" : "bg-white/10 text-white border-white/15"}`}>{sym}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 w-64">
        {nums.map((n, idx) => (
          <button key={n.id} type="button" onClick={() => pickTile(idx)} className={`h-20 rounded-2xl text-2xl font-black border cursor-pointer ${selIdx === idx ? "bg-cyan-400 text-black border-white" : "bg-slate-900 text-white border-cyan-400/35"}`}>{n.val}</button>
        ))}
      </div>
    </HiFiGameShell>
  );
};
Target24Game.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   17. AURORA SEQUENCE v2.0 (Simon 4-Pad Harmonic Memory)
   ═══════════════════════════════════════════════════════════════════════════ */
export const SimonAuroraGame = ({ onBack, isMuted, onSaveScore }) => {
  const [seq, setSeq] = useState([]);
  const [inputIdx, setInputIdx] = useState(0);
  const [litPad, setLitPad] = useState(-1);
  const [phase, setPhase] = useState("ready"); // ready | watch | input | gameover
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("simonaurora_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const playSequence = useCallback((nextSeq) => {
    setPhase("watch");
    nextSeq.forEach((pad, idx) => {
      setTimeout(() => { setLitPad(pad); playFx("coin"); }, idx * 520 + 250);
      setTimeout(() => setLitPad(-1), idx * 520 + 520);
    });
    setTimeout(() => { setInputIdx(0); setPhase("input"); }, nextSeq.length * 520 + 320);
  }, [playFx]);

  const startGame = () => {
    const first = [Math.floor(Math.random() * 4)];
    setSeq(first);
    setScore(0);
    playSequence(first);
  };

  const tapPad = (pad) => {
    if (phase !== "input") return;
    setLitPad(pad);
    setTimeout(() => setLitPad(-1), 180);
    if (seq[inputIdx] !== pad) {
      playFx("boom");
      if (score > highScore) { setHighScore(score); localStorage.setItem("simonaurora_highscore", String(score)); onSaveScore?.("simonaurora", score); }
      setPhase("gameover");
      return;
    }
    playFx("laser");
    if (inputIdx + 1 === seq.length) {
      const nextScore = seq.length * 50;
      setScore(nextScore);
      const nextSeq = [...seq, Math.floor(Math.random() * 4)];
      setSeq(nextSeq);
      setTimeout(() => playSequence(nextSeq), 450);
    } else {
      setInputIdx((i) => i + 1);
    }
  };

  const pads = ["bg-emerald-500", "bg-cyan-500", "bg-amber-400", "bg-rose-500"];
  return (
    <HiFiGameShell title="Aurora Sequence" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={startGame} controlsHint={phase === "watch" ? "Watch the glowing sequence..." : phase === "input" ? `Repeat sequence (${inputIdx}/${seq.length})` : "Press Start to begin harmonic memory"}>
      <div className="grid grid-cols-2 gap-3 w-64 aspect-square">
        {pads.map((cls, idx) => (
          <button key={idx} type="button" onClick={() => tapPad(idx)} className={`rounded-3xl border-2 border-white/25 transition-all cursor-pointer ${cls} ${litPad === idx ? "brightness-150 scale-105 shadow-[0_0_25px_#ffffff]" : "opacity-55"}`} />
        ))}
      </div>
      {(phase === "ready" || phase === "gameover") && (
        <button type="button" onClick={startGame} className="px-7 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-sm cursor-pointer">
          {phase === "ready" ? "Start Sequence" : `Game Over (Score: ${score}) • Retry`}
        </button>
      )}
    </HiFiGameShell>
  );
};
SimonAuroraGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   18. BITWISE VAULT HACKER v2.0 (8-Bit Binary Decoder)
   ═══════════════════════════════════════════════════════════════════════════ */
export const BinaryLockGame = ({ onBack, isMuted, onSaveScore }) => {
  const [bits, setBits] = useState([0,0,0,0,0,0,0,0]);
  const [target, setTarget] = useState(() => 1 + Math.floor(Math.random() * 254));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("binarylock_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const currentVal = bits.reduce((acc, b, idx) => acc + (b ? (1 << (7 - idx)) : 0), 0);

  const flipBit = (idx) => {
    if (timeLeft <= 0) return;
    const next = [...bits];
    next[idx] = next[idx] ? 0 : 1;
    setBits(next);
    playFx("laser");
    const val = next.reduce((acc, b, i) => acc + (b ? (1 << (7 - i)) : 0), 0);
    if (val === target) {
      const sc = score + 80;
      setScore(sc);
      playFx("tada");
      if (sc > highScore) { setHighScore(sc); localStorage.setItem("binarylock_highscore", String(sc)); onSaveScore?.("binarylock", sc); }
      setBits([0,0,0,0,0,0,0,0]);
      setTarget(1 + Math.floor(Math.random() * 254));
    }
  };

  const reset = () => { setBits([0,0,0,0,0,0,0,0]); setTarget(1 + Math.floor(Math.random() * 254)); setScore(0); setTimeLeft(45); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Bitwise Vault Hacker" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={reset} controlsHint="Flip binary bit switches (128 down to 1) so their sum equals the Decimal Lock Target" extraHeader={<span className="text-xs font-bold text-amber-300">{timeLeft}s</span>}>
      <div className="p-5 rounded-3xl bg-[#07101f] border-2 border-cyan-400/35 space-y-4 text-center max-w-md w-full">
        <div className="text-xs text-white/60 uppercase font-bold">Target Vault Code</div>
        <div className="text-4xl font-black text-amber-300 font-mono">{target}</div>
        <div className="grid grid-cols-8 gap-1.5">
          {bits.map((b, idx) => (
            <button key={idx} type="button" onClick={() => flipBit(idx)} className={`py-3 rounded-xl border font-mono text-sm font-black cursor-pointer ${b ? "bg-cyan-400 text-black border-white" : "bg-slate-900 text-white/60 border-white/15"}`}>
              <div>{b}</div>
              <div className="text-[10px] opacity-70">{1 << (7 - idx)}</div>
            </button>
          ))}
        </div>
        <div className="text-sm font-bold text-cyan-300">Current Sum: {currentVal}</div>
      </div>
    </HiFiGameShell>
  );
};
BinaryLockGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   19. PRIME BLITZ v2.0 (Rapid Prime vs Composite Classifier)
   ═══════════════════════════════════════════════════════════════════════════ */
export const PrimeSieveGame = ({ onBack, isMuted, onSaveScore }) => {
  const [num, setNum] = useState(() => 7 + Math.floor(Math.random() * 90));
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(3);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("primesieve_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const answer = (pickPrime) => {
    if (hp <= 0) return;
    const actual = isPrimeNumber(num);
    if (pickPrime === actual) {
      const sc = score + 40;
      setScore(sc);
      playFx("coin");
      if (sc > highScore) { setHighScore(sc); localStorage.setItem("primesieve_highscore", String(sc)); onSaveScore?.("primesieve", sc); }
    } else {
      setHp((h) => h - 1);
      playFx("boom");
    }
    setNum(3 + Math.floor(Math.random() * 115));
  };

  const reset = () => { setScore(0); setHp(3); setNum(7 + Math.floor(Math.random() * 90)); playFx("whoosh"); };

  return (
    <HiFiGameShell title="Prime Blitz" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={reset} controlsHint="Classify each number as PRIME or COMPOSITE before losing all 3 shields!" extraHeader={<span className="text-xs font-bold text-rose-400">{"❤️".repeat(Math.max(0, hp))}</span>}>
      <div className="p-6 rounded-3xl bg-[#07101f] border-2 border-emerald-400/35 w-full max-w-sm text-center space-y-5">
        <div className="text-5xl font-black text-white tabular-nums">{num}</div>
        {hp > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => answer(true)} className="py-3.5 rounded-2xl bg-emerald-400 text-black font-black text-sm cursor-pointer">PRIME</button>
            <button type="button" onClick={() => answer(false)} className="py-3.5 rounded-2xl bg-purple-400 text-black font-black text-sm cursor-pointer">COMPOSITE</button>
          </div>
        ) : (
          <button type="button" onClick={reset} className="px-6 py-2.5 rounded-xl bg-emerald-400 text-black font-black text-sm cursor-pointer">Play Again (Score: {score})</button>
        )}
      </div>
    </HiFiGameShell>
  );
};
PrimeSieveGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };

/* ═══════════════════════════════════════════════════════════════════════════
   20. CIPHER WORD FORGE v2.0 (Scrambled Tech/Space Word Blitz)
   ═══════════════════════════════════════════════════════════════════════════ */
const FORGE_WORDS = ["TORNADO", "QUANTUM", "ORBITAL", "NEBULA", "CIPHER", "PHOTON", "GALAXY", "VECTOR", "MATRIX", "PLASMA", "VERTEX", "ECLIPSE"];

export const AnagramForgeGame = ({ onBack, isMuted, onSaveScore }) => {
  const [word, setWord] = useState(() => FORGE_WORDS[0]);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("anagramforge_highscore") || 0));
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const playFx = useCallback((t) => { if (!isMutedRef.current) soundEngine.play(t); }, []);

  const scrambled = word.split("").sort((a, b) => (a > b ? -1 : 1)).join("");

  const nextWord = () => {
    setWord(FORGE_WORDS[Math.floor(Math.random() * FORGE_WORDS.length)]);
    setGuess("");
  };

  const submit = (e) => {
    e.preventDefault();
    if (guess.trim().toUpperCase() === word) {
      const sc = score + word.length * 20;
      setScore(sc);
      playFx("win");
      if (sc > highScore) { setHighScore(sc); localStorage.setItem("anagramforge_highscore", String(sc)); onSaveScore?.("anagramforge", sc); }
      nextWord();
    } else {
      playFx("boing");
    }
  };

  return (
    <HiFiGameShell title="Cipher Word Forge" badge="v2.0 UPDATED" onBack={onBack} score={score} highScore={highScore} onReset={nextWord} controlsHint="Unscramble the cosmic/cyber word and press Enter">
      <form onSubmit={submit} className="p-6 rounded-3xl bg-[#07101f] border-2 border-amber-400/35 w-full max-w-sm text-center space-y-4">
        <div className="text-3xl font-black tracking-[0.25em] text-amber-300 font-mono">{scrambled}</div>
        <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type decoded word..." className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/20 text-white text-center font-bold uppercase outline-none focus:border-amber-400" />
        <div className="flex gap-2 justify-center">
          <button type="submit" className="px-5 py-2 rounded-xl bg-amber-400 text-black font-black text-xs cursor-pointer">Submit</button>
          <button type="button" onClick={nextWord} className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer">Skip</button>
        </div>
      </form>
    </HiFiGameShell>
  );
};
AnagramForgeGame.propTypes = { onBack: PropTypes.func.isRequired, isMuted: PropTypes.bool, onSaveScore: PropTypes.func };
