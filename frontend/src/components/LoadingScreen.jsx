import React, { useEffect, useRef, useState } from "react";

/**
 * Key fixes vs original:
 * 1) **Stopped re-running the big effect every keystroke**. The old useEffect depended on
 *    `currentLineIndex` & `currentCharIndex`, so every typed char tore down timers and restarted them.
 * 2) **Gate completion on both typing & progress** so loading doesn't finish before text appears.
 * 3) **requestAnimationFrame-based progress** for smoothness and precise duration control.
 * 4) Clean timeout/interval management via refs to avoid orphan timers.
 */
const LoadingScreen = ({ onLoadingComplete, minDurationMs = 3000, charDelayMs = 12 }) => {
  const [progress, setProgress] = useState(0);
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentLine, setCurrentLine] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [isPressingEnter, setIsPressingEnter] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  // Alpha Premier League animation states
  const [showAlphaPremier, setShowAlphaPremier] = useState(true);
  const [transforming, setTransforming] = useState(false);
  const [showAPL, setShowAPL] = useState(false);

  // Status flags
  const [typingDone, setTypingDone] = useState(false);
  const [progressDone, setProgressDone] = useState(false);

  // Refs for timers/animation frame
  const rafRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const cursorIntervalRef = useRef(null);
  const pulseIntervalRef = useRef(null);
  const glitchIntervalRef = useRef(null);
  const enterTimeoutRef = useRef(null);
  const alphaPremierTimeoutRef = useRef(null);

  // Typing state refs (so we don't rerender-trigger effects)
  const lineIdxRef = useRef(0);
  const charIdxRef = useRef(0);

  const loadingTexts = useRef([
    "> INITIALIZING BLACKROSE AI ARENA...     ",
    "> CONNECTING TO AI MODELS...             ",
    "> CALIBRATING SYSTEMS...                 ",
    "> ESTABLISHING SECURE CONNECTION...      ",
    "> SYNCHRONIZING DATA STREAMS...          ",
    "> SYSTEM ONLINE.                         ",
  ]).current;

  // --- Progress (smooth, fixed duration) ---
  useEffect(() => {
    const start = performance.now();

    const tick = (t) => {
      const elapsed = t - start;
      const p = Math.min(100, (elapsed / minDurationMs) * 100);
      setProgress(p);
      if (p >= 100) {
        setProgressDone(true);
        rafRef.current && cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [minDurationMs]);

  // --- Typing loop ---
  useEffect(() => {
    const initialDelay = 30; // Start typing nearly immediately
    const enterPressDelay = 80; // time to animate Enter
    const pauseBetweenLines = 25; // small pause before next line

    const startTyping = () => {
      const typeChar = () => {
        const li = lineIdxRef.current;
        if (li >= loadingTexts.length) {
          // done
          setTypingDone(true);
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          return;
        }
        const full = loadingTexts[li];
        const ci = charIdxRef.current;
        if (ci < full.length) {
          // append next char
          setCurrentLine((prev) => prev + full[ci]);
          charIdxRef.current = ci + 1;
        } else {
          // Line complete: simulate Enter press
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setIsPressingEnter(true);
          enterTimeoutRef.current = window.setTimeout(() => {
            setIsPressingEnter(false);
            setDisplayedLines((prev) => [...prev, full]);
            setCurrentLine("");
            lineIdxRef.current = li + 1;
            charIdxRef.current = 0;
            // resume typing after short pause
            enterTimeoutRef.current = window.setTimeout(() => {
              if (!typingIntervalRef.current) {
                typingIntervalRef.current = window.setInterval(typeChar, charDelayMs);
              }
            }, pauseBetweenLines);
          }, enterPressDelay);
        }
      };

      // kick off interval
      typingIntervalRef.current = window.setInterval(typeChar, charDelayMs);
    };

    const kickoff = window.setTimeout(startTyping, initialDelay);

    return () => {
      window.clearTimeout(kickoff);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    };
  }, [charDelayMs, loadingTexts.length]);

  // --- Cursor blink ---
  useEffect(() => {
    cursorIntervalRef.current = window.setInterval(() => setShowCursor((p) => !p), 500);
    return () => {
      if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
    };
  }, []);

  // --- Ambient effects (pulse, glitch) ---
  useEffect(() => {
    pulseIntervalRef.current = window.setInterval(() => {
      setPulseActive(true);
      const to = window.setTimeout(() => setPulseActive(false), 400);
      return () => clearTimeout(to);
    }, 1000);

    // Random glitch effect
    const scheduleRandomGlitch = () => {
      // Random delay between 800ms and 3000ms
      const randomDelay = Math.random() * (3000 - 800) + 800;
      glitchIntervalRef.current = window.setTimeout(() => {
        setGlitchActive(true);
        const to = window.setTimeout(() => {
          setGlitchActive(false);
          scheduleRandomGlitch(); // Schedule next random glitch
        }, 150);
        return () => clearTimeout(to);
      }, randomDelay);
    };

    scheduleRandomGlitch(); // Start the random glitch cycle

    return () => {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      if (glitchIntervalRef.current) clearTimeout(glitchIntervalRef.current);
    };
  }, []);

  // --- Alpha Premier League transformation ---
  useEffect(() => {
    // After 2 seconds, start the transformation
    alphaPremierTimeoutRef.current = setTimeout(() => {
      setTransforming(true);
      // Heavy glitch for 800ms
      setTimeout(() => {
        setShowAlphaPremier(false);
        setShowAPL(true);
        setTransforming(false);
      }, 800);
    }, 2000);

    return () => {
      if (alphaPremierTimeoutRef.current) clearTimeout(alphaPremierTimeoutRef.current);
    };
  }, []);

  // --- Finish only when BOTH are done ---
  useEffect(() => {
    if (typingDone && progressDone) {
      // small cosmetic delay to let the last line settle
      const to = window.setTimeout(() => onLoadingComplete?.(), 220);
      return () => clearTimeout(to);
    }
  }, [typingDone, progressDone, onLoadingComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden ${
        glitchActive ? "glitch-screen" : ""
      }`}
    >
      {/* Glitch overlays */}
      {glitchActive && (
        <>
          <div className="glitch-overlay glitch-overlay-1" />
          <div className="glitch-overlay glitch-overlay-2" />
          <div className="glitch-overlay glitch-overlay-3" />
        </>
      )}

      {/* Ambient grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="jarvis-grid" />
      </div>

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`jarvis-glow ${pulseActive ? "pulse-active" : ""}`} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-12 px-4 max-w-2xl w-full">
        {/* Logo */}
        <div className={`text-center ${glitchActive ? "glitch-text" : ""}`}>
          {/* Alpha Premier League / A.P.L */}
          <div className="mb-6 relative">
            {showAlphaPremier && (
              <div className={`transition-all duration-300 ${transforming ? "heavy-glitch" : ""}`}>
                <h1
                  className="text-4xl md:text-6xl font-bold text-bloomberg-primary font-mono tracking-wider mb-2"
                  style={{ textShadow: "0 0 20px rgba(15, 255, 8, 0.5)" }}
                  data-text="ALPHA PREMIER LEAGUE"
                >
                  ALPHA PREMIER LEAGUE
                </h1>
                <p className="text-lg md:text-xl text-bloomberg-primary font-mono tracking-widest opacity-70">
                  by Blackrose
                </p>
              </div>
            )}
            
            {showAPL && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <h1
                  className="text-6xl md:text-8xl font-bold text-bloomberg-primary font-mono tracking-wider"
                  style={{ textShadow: "0 0 30px rgba(15, 255, 8, 0.8)" }}
                >
                  A.P.L
                </h1>
              </div>
            )}
          </div>

        </div>

        {/* Console typing */}
        <div
          className="w-full max-w-2xl bg-gray-950 border border-bloomberg-primary rounded-md p-4 font-mono text-sm overflow-hidden"
          style={{ boxShadow: "0 0 20px rgba(15, 255, 8, 0.2)" }}
        >
          <div className="space-y-1">
            {displayedLines.map((line, i) => (
              <div key={i} className="text-bloomberg-primary whitespace-pre">
                {line}
              </div>
            ))}

            {/* current line */}
            {!typingDone && (
              <div className="text-bloomberg-primary whitespace-pre flex items-center">
                <span>{currentLine}</span>
                <span
                  className={`inline-block w-2 h-4 ml-0.5 ${
                    showCursor ? "bg-bloomberg-primary" : "bg-transparent"
                  } ${isPressingEnter ? "animate-enter-press" : ""}`}
                  style={{ transition: "all 0.1s" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="h-2 bg-gray-900 border border-bloomberg-primary relative overflow-hidden">
            <div
              className="h-full bg-bloomberg-primary transition-[width] duration-100 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 loading-stripes" />
            </div>
          </div>
          <p className="text-bloomberg-primary font-mono text-xs md:text-sm text-center mt-2">
            {Math.round(progress)}%
          </p>
        </div>
      </div>

      {/* Styles scoped via styled-jsx or twin */}
      <style jsx>{`
        @keyframes enter-press {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(2px); opacity: 0.5; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-enter-press { animation: enter-press 0.3s ease-out; }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        @keyframes stripes { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
        .loading-stripes {
          background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 20px);
          animation: stripes 1s linear infinite;
        }
        .jarvis-grid {
          background-image: linear-gradient(rgba(15,255,8,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(15,255,8,0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          height: 100%; width: 100%;
          animation: gridMove 20s linear infinite;
        }
        @keyframes gridMove { 0% { background-position: 0 0; } 100% { background-position: 50px 50px; } }
        .jarvis-glow { width: 600px; height: 600px; background: radial-gradient(circle, rgba(15,255,8,0.15) 0%, rgba(15,255,8,0.05) 30%, transparent 70%); border-radius: 50%; transition: all 0.6s ease; }
        .jarvis-glow.pulse-active { animation: pulse 0.6s ease-out; }

        /* Glitch */
        .glitch-screen { animation: glitch-screen 0.15s ease-in-out; }
        @keyframes glitch-screen { 0%, 100% { transform: translate(0); } 33% { transform: translate(-2px, 2px); } 66% { transform: translate(2px, -2px); } }
        .glitch-overlay { position: absolute; inset: 0; pointer-events: none; }
        .glitch-overlay-1 { background: linear-gradient(90deg, transparent 0%, rgba(255,0,0,0.1) 50%, transparent 100%); animation: glitch-anim 0.15s ease-in-out; mix-blend-mode: screen; }
        .glitch-overlay-2 { background: linear-gradient(90deg, transparent 0%, rgba(0,255,255,0.1) 50%, transparent 100%); animation: glitch-anim 0.15s ease-in-out reverse; mix-blend-mode: screen; }
        .glitch-overlay-3 { background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(15,255,8,0.05) 2px, rgba(15,255,8,0.05) 4px); animation: scan-lines 0.1s linear infinite; }
        @keyframes glitch-anim {
          0% { clip-path: inset(40% 0 61% 0); transform: translate(0); }
          20% { clip-path: inset(92% 0 1% 0); transform: translate(-5px, 5px); }
          40% { clip-path: inset(43% 0 1% 0); transform: translate(5px, -5px); }
          60% { clip-path: inset(25% 0 58% 0); transform: translate(-5px, 5px); }
          80% { clip-path: inset(54% 0 7% 0); transform: translate(5px, -5px); }
          100% { clip-path: inset(58% 0 43% 0); transform: translate(0); }
        }
        @keyframes scan-lines { 0% { transform: translateY(0); } 100% { transform: translateY(4px); } }
        .glitch-text { position: relative; }
        .glitch-text::before, .glitch-text::after { content: attr(data-text); position: absolute; inset: 0; opacity: 0.8; }
        .glitch-text::before { animation: glitch-text-1 0.15s ease-in-out; color: #ff00ff; z-index: -1; }
        .glitch-text::after { animation: glitch-text-2 0.15s ease-in-out; color: #00ffff; z-index: -2; }
        @keyframes glitch-text-1 { 0%,100%{transform:translate(0);} 33%{transform:translate(-3px,-2px);} 66%{transform:translate(3px,2px);} }
        @keyframes glitch-text-2 { 0%,100%{transform:translate(0);} 33%{transform:translate(2px,3px);} 66%{transform:translate(-2px,-3px);} }

        /* Cyberpunk glitch animation for Alpha Premier League transformation */
        .heavy-glitch {
          position: relative;
          animation: cyberpunk-flicker 0.8s ease-in-out;
        }
        
        .heavy-glitch::before,
        .heavy-glitch::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          opacity: 0.8;
        }
        
        .heavy-glitch::before {
          color: #ff0080;
          z-index: -1;
          animation: cyberpunk-layer-1 0.8s ease-in-out;
        }
        
        .heavy-glitch::after {
          color: #00ffff;
          z-index: -2;
          animation: cyberpunk-layer-2 0.8s ease-in-out;
        }

        @keyframes cyberpunk-flicker {
          0%, 100% { opacity: 1; filter: contrast(1) brightness(1); }
          5% { opacity: 0.9; filter: contrast(1.2) brightness(1.1); }
          10% { opacity: 0.8; filter: contrast(1.5) brightness(0.9); }
          15% { opacity: 1; filter: contrast(1) brightness(1.2); }
          25% { opacity: 0.7; filter: contrast(1.3) brightness(0.8); }
          30% { opacity: 1; filter: contrast(1) brightness(1); }
          35% { opacity: 0.9; filter: contrast(1.4) brightness(1.1); }
          45% { opacity: 0.6; filter: contrast(1.6) brightness(0.7); }
          50% { opacity: 1; filter: contrast(1) brightness(1.3); }
          60% { opacity: 0.8; filter: contrast(1.5) brightness(0.9); }
          70% { opacity: 1; filter: contrast(1) brightness(1); }
          75% { opacity: 0.9; filter: contrast(1.3) brightness(1.1); }
          85% { opacity: 0.7; filter: contrast(1.7) brightness(0.8); }
          90% { opacity: 1; filter: contrast(1) brightness(1.2); }
        }

        @keyframes cyberpunk-layer-1 {
          0%, 100% { 
            transform: translate(0); 
            clip-path: inset(0); 
            opacity: 0;
          }
          10% { 
            transform: translate(-3px, 0); 
            clip-path: inset(10% 0 80% 0); 
            opacity: 0.8;
          }
          20% { 
            transform: translate(2px, 0); 
            clip-path: inset(70% 0 20% 0); 
            opacity: 0.6;
          }
          30% { 
            transform: translate(-4px, 0); 
            clip-path: inset(20% 0 60% 0); 
            opacity: 0.9;
          }
          40% { 
            transform: translate(3px, 0); 
            clip-path: inset(80% 0 10% 0); 
            opacity: 0.7;
          }
          50% { 
            transform: translate(-2px, 0); 
            clip-path: inset(40% 0 40% 0); 
            opacity: 0.8;
          }
          60% { 
            transform: translate(4px, 0); 
            clip-path: inset(5% 0 85% 0); 
            opacity: 0.6;
          }
          70% { 
            transform: translate(-3px, 0); 
            clip-path: inset(60% 0 30% 0); 
            opacity: 0.9;
          }
          80% { 
            transform: translate(2px, 0); 
            clip-path: inset(30% 0 50% 0); 
            opacity: 0.7;
          }
          90% { 
            transform: translate(-1px, 0); 
            clip-path: inset(85% 0 5% 0); 
            opacity: 0.8;
          }
        }

        @keyframes cyberpunk-layer-2 {
          0%, 100% { 
            transform: translate(0); 
            clip-path: inset(0); 
            opacity: 0;
          }
          15% { 
            transform: translate(4px, 0); 
            clip-path: inset(50% 0 40% 0); 
            opacity: 0.7;
          }
          25% { 
            transform: translate(-3px, 0); 
            clip-path: inset(20% 0 70% 0); 
            opacity: 0.9;
          }
          35% { 
            transform: translate(5px, 0); 
            clip-path: inset(80% 0 15% 0); 
            opacity: 0.6;
          }
          45% { 
            transform: translate(-2px, 0); 
            clip-path: inset(10% 0 85% 0); 
            opacity: 0.8;
          }
          55% { 
            transform: translate(3px, 0); 
            clip-path: inset(65% 0 25% 0); 
            opacity: 0.7;
          }
          65% { 
            transform: translate(-4px, 0); 
            clip-path: inset(35% 0 55% 0); 
            opacity: 0.9;
          }
          75% { 
            transform: translate(2px, 0); 
            clip-path: inset(75% 0 20% 0); 
            opacity: 0.6;
          }
          85% { 
            transform: translate(-3px, 0); 
            clip-path: inset(45% 0 45% 0); 
            opacity: 0.8;
          }
          95% { 
            transform: translate(1px, 0); 
            clip-path: inset(90% 0 5% 0); 
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
