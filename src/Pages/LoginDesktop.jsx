
/*
===========================================
🕵️ ChatTornado Hidden Easter Eggs
===========================================

1. Enter password "123456"
   → Displays: "Seriously? That's your password?"

2. Enter username "odisha"
   → Displays: "Hello Damanjodi!"

3. Enter username "tornado"
   → Spins the entire login card 360°.

4. Enter username "sudo"
   → Login button text changes to "rm -rf /".

5. Enter password "error"
   → Forces authentication to fail with "Access Denied".

6. Enter username "rick@roll.com"
   → Background particles begin moving in a sine-wave pattern.

7. Hold Shift and click the password visibility (Eye) icon.
   → Summons a giant 👁️ that follows the cursor.

8. Move the mouse almost exactly to the center of the screen.
   → Network particles and connecting lines turn gold.

9. Click the ChatTornado logo 5 times.
   → Unlocks the hidden Hacker theme.

10. Enter the Konami Code:
    ↑ ↑ ↓ ↓ ← → ← → B A
    → Unlocks Hacker theme and Matrix rain mode.

11. Switch themes in this exact order:
    Vortex → Neon → Plasma → Neon
    → Unlocks the secret Ultra theme.

12. Hacker and Ultra themes remain hidden until unlocked.

===========================================
✨ Hidden Visual Features
===========================================

• Active Nodes fluctuate randomly to simulate a live network.
• Global Latency changes every few seconds.
• Theme colors smoothly interpolate during switching.
• Particles are repelled by the mouse cursor.
• Typing creates ripple effects in the background.
• Successful login generates a large pulse animation.
• Password strength meter updates in real time.
• Login card tilts in 3D based on mouse position.

===========================================
*/
{ console.log("LoginDesktop loaded!") }
import R, {
    useState as uS,
    useEffect as uE,
    useRef as uR,
    useCallback as uC
} from "react";
import {
    Wind as _W,
    Mail as _M,
    Lock as _L,
    Eye as _E,
    EyeOff as _Eo,
    Zap as _Z,
    Shield as _S,
    Activity as _A,
    ArrowRight as _Ar,
    CheckCircle as _C,
    AlertTriangle as _At,
    Server as _Sv,
    Globe as _G,
    Cpu as _Cp,
    Users as _U
} from "lucide-react";
const _0x1 = 0x4b;
const _0x2 = 0x78;
const _0x3 = 0x96;
const _0x4 = 0xfa;
const _0x5 = 0x8;
const _0x6 = 0xc;
const _0x7 = 0x320;
const _0x8 = 0.05;
const _0x9 = "Gateway Ready";
const _0xa = "Establishing Connection...";
const _0xb = "Verifying Identity...";
const _0xc = "Encryption Active";
const _0xd = "Access Granted";
const _0xe = "Invalid credentials. Access denied.";
const _0xf = "Network timeout. Retrying...";
const _0x10 = "Seriously? That's your password?";
const _0x11 = "rm -rf /";
const _0x12 = "Hello Damanjodi!";
const _0x13 = [0x26, 0x26, 0x28, 0x28, 0x25, 0x27, 0x25, 0x27, 0x42, 0x41];
const _0x14 = "tornado";
const _0x15 = "123456";
const _0x16 = "sudo";
const _0x17 = "rick@roll.com";
const _0x18 = "odisha";
const _T = {
    V: {
        i: 'V',
        n: 'Vortex',
        p: [0x63, 0x66, 0xf1],
        a: [0xa8, 0x55, 0xf7],
        bs: [0xf, 0x17, 0x2a],
        be: [0x2, 0x6, 0x17],
        ta: 'text-indigo-400',
        tg: 'shadow-indigo-500/20',
        tb: 'focus:border-indigo-500/50',
        tbu: 'bg-indigo-600 hover:bg-indigo-500',
        d: 'bg-indigo-500'
    },
    N: {
        i: 'N',
        n: 'Neon',
        p: [0x10, 0xb9, 0x81],
        a: [0x14, 0xb8, 0xa6],
        bs: [0x2, 0x2c, 0x22],
        be: [0x2, 0x6, 0x17],
        ta: 'text-emerald-400',
        tg: 'shadow-emerald-500/20',
        tb: 'focus:border-emerald-500/50',
        tbu: 'bg-emerald-600 hover:bg-emerald-500',
        d: 'bg-emerald-500'
    },
    P: {
        i: 'P',
        n: 'Plasma',
        p: [0xf9, 0x73, 0x16],
        a: [0xef, 0x44, 0x44],
        bs: [0x43, 0x14, 0x7],
        be: [0x2, 0x6, 0x17],
        ta: 'text-orange-400',
        tg: 'shadow-orange-500/20',
        tb: 'focus:border-orange-500/50',
        tbu: 'bg-orange-600 hover:bg-orange-500',
        d: 'bg-orange-500'
    },
    H: {
        i: 'H',
        n: 'Hacker',
        p: [0x0, 0xff, 0x0],
        a: [0x0, 0xaa, 0x0],
        bs: [0x0, 0x0, 0x0],
        be: [0x0, 0x22, 0x0],
        ta: 'text-green-500',
        tg: 'shadow-green-500/50',
        tb: 'focus:border-green-500',
        tbu: 'bg-green-600 hover:bg-green-500',
        d: 'bg-green-500'
    },
    U: {
        i: 'U',
        n: 'Ultra',
        p: [0xff, 0x0, 0xff],
        a: [0x0, 0xff, 0xff],
        bs: [0x22, 0x0, 0x22],
        be: [0x0, 0x22, 0x22],
        ta: 'text-fuchsia-500',
        tg: 'shadow-fuchsia-500/50',
        tb: 'focus:border-fuchsia-500',
        tbu: 'bg-fuchsia-600 hover:bg-fuchsia-500',
        d: 'bg-fuchsia-500'
    }
};
const _l1 = (s, e, a) => (1 - a) * s + a * e;
const _l2 = (c1, c2, a) => c1.map((c, i) => _l1(c, c2[i], a));
const _fC = (a, o = 1) => `rgba(${a[0]}, ${a[1]}, ${a[2]}, ${o})`;
const _cP = (p) => {
    if (!p) return { s: 0, l: '', c: 'bg-transparent' };
    let s = 0;
    if (p.length > 7) s += 25;
    if (p.length > 12) s += 15;
    if (/[A-Z]/.test(p)) s += 20;
    if (/[0-9]/.test(p)) s += 20;
    if (/[^A-Za-z0-9]/.test(p)) s += 20;
    if (s < 40) return { s, l: 'Weak', c: 'bg-red-500' };
    if (s < 75) return { s, l: 'Fair', c: 'bg-yellow-400' };
    if (s < 90) return { s, l: 'Good', c: 'bg-indigo-400' };
    return { s, l: 'Strong', c: 'bg-emerald-400' };
};
export default function X() {
    const [t, sT] = uS(_T.V);
    const [e, sE] = uS('');
    const [p, sP] = uS('');
    const [s, sS] = uS(!1);
    const [st, sSt] = uS(_0x9);
    const [it, sIt] = uS(!1);
    const [il, sIl] = uS(!1);
    const [is, sIs] = uS(!1);
    const [ie, sIe] = uS(!1);
    const [mp, sMp] = uS({ x: 0, y: 0 });
    const [ct, sCt] = uS({ x: 0, y: 0 });
    const [fi, sFi] = uS(null);
    const [lu, sLu] = uS(14502);
    const [la, sLa] = uS(24);
    const [k, sK] = uS([]);
    const [mr, sMr] = uS(!1);
    const [lc, sLc] = uS(0);
    const [ts, sTs] = uS([]);
    const [ey, sEy] = uS(!1);
    const cR = uR(null);
    const bR = uR(null);
    const caR = uR(null);
    const tR = uR([]);
    const tyR = uR(null);
    const eR = uR({
        p: [],
        r: [],
        pu: [],
        cc: { ..._T.V },
        co: { x: 0, y: 0 }
    });
    uE(() => {
        const uI = setInterval(() => sLu(p => p + Math.floor(Math.random() * 5) - 2), 3000);
        const lI = setInterval(() => sLa(p => Math.max(12, Math.min(45, p + Math.floor(Math.random() * 9) - 4))), 2000);
        const kD = (e) => {
            sK(p => {
                const n = [...p, e.keyCode].slice(-10);
                if (n.join(',') === _0x13.join(',')) sMr(!0);
                return n;
            });
        };
        window.addEventListener('keydown', kD);
        return () => {
            clearInterval(uI);
            clearInterval(lI);
            window.removeEventListener('keydown', kD);
            tR.current.forEach(clearTimeout);
        };
    }, []);
    const hT = (ev, iE = !1) => {
        const v = ev.target.value;
        if (iE) sE(v); else sP(v);
        if (iE && v === _0x18) { sSt(_0x12); }
        else if (!iE && v === _0x15) { sSt(_0x10); }
        else { sSt(_0xa); }
        sIt(!0);
        clearTimeout(tyR.current);
        if (fi) eR.current.r.push({ r: 0, a: 0.5, m: _0x4 });
        tyR.current = setTimeout(() => {
            sIt(!1);
            sSt((iE && v === _0x18) ? _0x12 : (!iE && v === _0x15) ? _0x10 : _0x9);
        }, 1000);
    };
    const hMM = (ev) => {
        sMp({ x: ev.clientX, y: ev.clientY });
        if (!caR.current) return;
        const r = caR.current.getBoundingClientRect();
        const x = ev.clientX - r.left;
        const y = ev.clientY - r.top;
        const cX = r.width / 2;
        const cY = r.height / 2;
        sCt({ x: ((y - cY) / cY) * -4, y: ((x - cX) / cX) * 4 });
    };
    const hS = async (ev) => {
        ev.preventDefault();
        if (!e || !p || il || is) return;

        sIl(true);
        sIe(false);
        sSt(_0xb); // "Verifying Identity..."

        try {
            // ✅ REAL API CALL TO BACKEND
            const response = await fetch('http://192.168.31.72:8000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: e, password: p })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Login successful
                sessionStorage.setItem('token', data.access_token);
                sSt(_0xd); // "Access Granted"
                sIs(true);

                // Navigate to dashboard
                window.location.href = '/messages';
            } else {
                // ❌ Login failed
                sSt(data.detail || _0xe);
                sIe(true);
                setTimeout(() => sIe(false), 3000);
            }
        } catch (error) {
            // Network error
            sSt(_0xf);
            sIe(true);
            setTimeout(() => sIe(false), 3000);
        } finally {
            sIl(false);
        }
    };
    const cL = () => {
        sLc(x => {
            const n = x + 1;
            if (n >= 5) sT(_T.H);
            return n;
        });
    };
    const cTh = (nt) => {
        sT(nt);
        sTs(x => {
            const a = [...x, nt.i].slice(-4);
            if (a.join('') === 'VNPN') sT(_T.U);
            return a;
        });
    };
    uE(() => {
        const c = cR.current;
        if (!c) return;
        const ctx = c.getContext('2d', { alpha: !1 });
        let aF;
        let w, h;
        const en = eR.current;
        const rZ = () => {
            w = window.innerWidth;
            h = window.innerHeight;
            c.width = w;
            c.height = h;
        };
        window.addEventListener('resize', rZ);
        rZ();
        if (en.p.length === 0) {
            for (let i = 0; i < _0x1; i++) {
                en.p.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    s: Math.random() * 2 + 0.5,
                    ba: Math.random() * 0.5 + 0.1
                });
            }
        }
        const rD = () => {
            en.cc.p = _l2(en.cc.p, t.p, _0x8);
            en.cc.a = _l2(en.cc.a, t.a, _0x8);
            en.cc.bs = _l2(en.cc.bs, t.bs, _0x8);
            en.cc.be = _l2(en.cc.be, t.be, _0x8);
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, _fC(en.cc.bs));
            g.addColorStop(1, _fC(en.cc.be));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            if (mr) {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = '#0f0';
                ctx.font = '15px monospace';
                for (let i = 0; i < 100; i++) {
                    ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), Math.random() * w, Math.random() * h);
                }
            }
            const gd = Math.abs(mp.x - w / 2) < 2 && Math.abs(mp.y - h / 2) < 2;
            const tX = (mp.x - w / 2) * -0.05;
            const tY = (mp.y - h / 2) * -0.05;
            en.co.x += (tX - en.co.x) * 0.05;
            en.co.y += (tY - en.co.y) * 0.05;
            ctx.save();
            ctx.translate(en.co.x, en.co.y);
            for (let i = 0; i < en.p.length; i++) {
                const p = en.p[i];
                p.x += p.vx + (e === _0x17 ? Math.sin(Date.now() / 200 + i) * 2 : 0);
                p.y += p.vy;
                if (p.x < -50) p.x = w + 50;
                if (p.x > w + 50) p.x = -50;
                if (p.y < -50) p.y = h + 50;
                if (p.y > h + 50) p.y = -50;
                const dx = p.x - mp.x + en.co.x;
                const dy = p.y - mp.y + en.co.y;
                const dt = Math.sqrt(dx * dx + dy * dy);
                if (dt < _0x3) {
                    const f = (_0x3 - dt) / _0x3;
                    p.x += (dx / dt) * f * 2;
                    p.y += (dy / dt) * f * 2;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
                ctx.fillStyle = gd ? '#ffd700' : _fC(en.cc.p, p.ba);
                ctx.fill();
            }
            ctx.lineWidth = 0.5;
            for (let i = 0; i < en.p.length; i++) {
                for (let j = i + 1; j < en.p.length; j++) {
                    const p1 = en.p[i];
                    const p2 = en.p[j];
                    if (Math.abs(p1.x - p2.x) > _0x2) continue;
                    if (Math.abs(p1.y - p2.y) > _0x2) continue;
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dt = Math.sqrt(dx * dx + dy * dy);
                    if (dt < _0x2) {
                        const a = (1 - dt / _0x2) * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = gd ? `rgba(255,215,0,${a})` : _fC(en.cc.a, a);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
            for (let i = en.r.length - 1; i >= 0; i--) {
                const r = en.r[i];
                r.r += _0x5;
                r.a -= 0.02;
                if (r.a <= 0) { en.r.splice(i, 1); continue; }
                ctx.beginPath();
                ctx.arc(w / 2, h / 2, r.r, 0, Math.PI * 2);
                ctx.strokeStyle = _fC(en.cc.p, r.a * 0.3);
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            for (let i = en.pu.length - 1; i >= 0; i--) {
                const pu = en.pu[i];
                pu.r += pu.s || _0x6;
                pu.a -= 0.015;
                if (pu.a <= 0 || pu.r > _0x7) { en.pu.splice(i, 1); continue; }
                ctx.beginPath();
                ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
                ctx.strokeStyle = _fC(en.cc.a, pu.a);
                ctx.lineWidth = 4;
                ctx.stroke();
            }
            aF = requestAnimationFrame(rD);
        };
        rD();
        return () => {
            window.removeEventListener('resize', rZ);
            cancelAnimationFrame(aF);
        };
    }, [t, mp, e, mr]);
    const pS = _cP(p);
    const sSg = p.length > 0;
    return (
        <div
            className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans bg-slate-950 text-slate-200"
            onMouseMove={hMM}
            onMouseLeave={() => sCt({ x: 0, y: 0 })}
        >
            <canvas ref={cR} className="absolute inset-0 z-0 pointer-events-none" />
            <div
                className="absolute top-0 left-0 w-full h-1 z-10 transition-colors duration-1000 ease-in-out"
                style={{ background: `linear-gradient(90deg, rgb(${t.p.join(',')}), rgb(${t.a.join(',')}))` }}
            />
            {ey && <div className="absolute z-50 text-6xl animate-bounce pointer-events-none" style={{ left: mp.x, top: mp.y }}>👁️</div>}
            <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-screen px-6 py-12 lg:p-0">
                <div className="flex flex-col justify-center h-full lg:pr-16 xl:pr-24 space-y-10 relative">
                    <div className="absolute top-1/4 left-10 w-32 h-32 bg-indigo-900/40 rounded-full mix-blend-screen pointer-events-none" />
                    <div className="absolute bottom-1/3 right-20 w-48 h-48 bg-emerald-900/40 rounded-full mix-blend-screen pointer-events-none" />
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center space-x-3 group cursor-pointer" onClick={cL}>
                            <div className={`p-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-lg ${t.tg} transition-all duration-500 group-hover:scale-105`}>
                                <_W className={`w-8 h-8 ${t.ta} animate-pulse duration-2000`} />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                ChatTornado
                            </h1>
                        </div>
                        <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                            Experience the next generation of secure, high-velocity enterprise communications. Built for scale, encrypted by default.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
                            <_U className={`w-6 h-6 ${t.ta}`} />
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Nodes</p>
                                <p className="text-xl font-bold text-white tabular-nums">{lu.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
                            <_A className={`w-6 h-6 ${t.ta}`} />
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Global Latency</p>
                                <p className="text-xl font-bold text-white tabular-nums">{la}ms</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { ic: _Z, ti: 'Real-time', de: 'Zero-delay socket layer' },
                            { ic: _S, ti: 'E2E Secure', de: 'Military-grade encryption' },
                            { ic: _G, ti: 'Global', de: 'Edge-distributed network' }
                        ].map((f, i) => (
                            <div key={i} className="group p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20">
                                <f.ic className={`w-6 h-6 mb-3 text-slate-400 group-hover:${t.ta} transition-colors duration-300`} />
                                <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors">{f.ti}</h3>
                                <p className="text-sm text-slate-500 mt-1">{f.de}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-center lg:justify-end h-full perspective-1000">
                    <div
                        ref={caR}
                        style={{
                            transform: e === _0x14 ? `rotate(360deg)` : `rotateX(${ct.x}deg) rotateY(${ct.y}deg)`,
                            transition: e === _0x14 ? 'transform 1s ease-in-out' : 'transform 0.1s ease-out'
                        }}
                        className={`w-full max-w-md relative ${ie ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
                    >
                        <div className={`absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-${t.i === 'V' ? 'indigo' : t.i === 'N' ? 'emerald' : t.i === 'H' ? 'green' : t.i === 'U' ? 'fuchsia' : 'orange'}-500/40 to-transparent opacity-80 transition-all duration-1000`} />
                        <div className="relative bg-slate-900/95 border border-slate-700 shadow-2xl rounded-[2rem] p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <div className="text-center mb-10">
                                <h2 className="text-2xl font-bold text-white mb-2">Initialize Link</h2>
                                <div className="h-6 flex items-center justify-center" aria-live="polite">
                                    <p className={`text-sm font-medium transition-all duration-300 ${st === _0xd ? 'text-emerald-400' :
                                        st === _0xe || st === _0x10 ? 'text-red-400' :
                                            it ? t.ta : 'text-slate-400'
                                        }`}>
                                        {st}
                                    </p>
                                </div>
                            </div>
                            <form onSubmit={hS} className="space-y-6">
                                <div className="relative group">
                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${fi === 'e' ? t.ta : 'text-slate-500'}`}>
                                        <_M className="h-5 w-5" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={e}
                                        onChange={(ev) => hT(ev, !0)}
                                        onFocus={() => sFi('e')}
                                        onBlur={() => sFi(null)}
                                        className={`block w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all duration-300 ${t.tb} ${fi === 'e' ? 'bg-black' : ''}`}
                                        placeholder="agent@chattornado.dev"
                                    />
                                </div>
                                <div className="relative space-y-2">
                                    <div className="relative group">
                                        <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300 ${fi === 'p' ? t.ta : 'text-slate-500'}`}>
                                            <_L className="h-5 w-5" />
                                        </div>
                                        <input
                                            type={s ? "text" : "password"}
                                            required
                                            value={p}
                                            onChange={(ev) => hT(ev, !1)}
                                            onFocus={() => sFi('p')}
                                            onBlur={() => sFi(null)}
                                            className={`block w-full pl-12 pr-12 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all duration-300 ${t.tb} ${fi === 'p' ? 'bg-black' : ''}`}
                                            placeholder="••••••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={(ev) => ev.shiftKey ? sEy(!0) : sS(!s)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors focus:outline-none"
                                        >
                                            <div className="relative w-5 h-5">
                                                <_E className={`absolute inset-0 h-5 w-5 transition-opacity duration-300 ${s ? 'opacity-100' : 'opacity-0'}`} />
                                                <_Eo className={`absolute inset-0 h-5 w-5 transition-opacity duration-300 ${s ? 'opacity-0' : 'opacity-100'}`} />
                                            </div>
                                        </button>
                                    </div>
                                    <div className={`transition-all duration-500 overflow-hidden ${sSg ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="flex justify-between items-center text-xs mt-1 px-1">
                                            <span className="text-slate-400">Security protocol:</span>
                                            <span className={`font-medium transition-colors duration-300 ${pS.s < 40 ? 'text-red-400' : pS.s < 75 ? 'text-yellow-400' : pS.s < 90 ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                                {pS.l}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                                            <div className={`h-full ${pS.c} transition-all duration-500 ease-out`} style={{ width: `${Math.max(5, pS.s)}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    ref={bR}
                                    type="submit"
                                    disabled={il || is}
                                    className={`relative w-full py-4 mt-4 rounded-xl font-medium text-white overflow-hidden group transition-all duration-300 shadow-lg ${t.tbu} disabled:opacity-80 disabled:cursor-not-allowed`}
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 ease-out rounded-xl" />
                                    <div className="relative flex items-center justify-center space-x-2">
                                        {il ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Authenticating...</span>
                                            </>
                                        ) : is ? (
                                            <>
                                                <_C className="w-5 h-5" />
                                                <span>Link Established</span>
                                            </>
                                        ) : ie ? (
                                            <>
                                                <_At className="w-5 h-5" />
                                                <span>Access Denied</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>{e === _0x16 ? _0x11 : "Establish Link"}</span>
                                                <_Ar className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>
                            <div className="mt-10 pt-6 border-t border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Interface Theme</span>
                                <div className="flex space-x-2">
                                    {[...Object.values(_T).filter(x => x.i !== 'H' && x.i !== 'U'), ...(t.i === 'H' ? [_T.H] : []), ...(t.i === 'U' ? [_T.U] : [])].map((th) => (
                                        <button
                                            key={th.i}
                                            onClick={() => cTh(th)}
                                            className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${t.i === th.i ? 'bg-slate-800 text-white ring-1 ring-slate-600' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full mr-2 ${th.d}`} />
                                            {th.n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }` }} />
        </div>
    );
}