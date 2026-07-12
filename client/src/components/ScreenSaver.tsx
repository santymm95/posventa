import React, { useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export default function ScreenSaver() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const resetTimer = () => {
    lastActiveRef.current = Date.now();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, IDLE_TIMEOUT);
  };

  useEffect(() => {
    // Start timer
    resetTimer();

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const onActivity = () => {
      if (visible) return; // don't reset while screensaver visible
      resetTimer();
    };

    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true });

    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [visible]);

  const onDismiss = () => {
    setVisible(false);
    // restart idle timer
    resetTimer();
  };

  if (!visible) return null;

  return (
    <div
      onClick={onDismiss}
      onTouchStart={onDismiss}
      role="button"
      aria-label="Dismiss screensaver"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.47), rgba(15,23,42,0.95) 65%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 25%), radial-gradient(circle at 80% 30%, rgba(248,113,113,0.12), transparent 18%), radial-gradient(circle at 50% 80%, rgba(59,130,246,0.08), transparent 22%)",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.04), transparent 20%, transparent 80%, rgba(255,255,255,0.02))",
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />
      <img
        src="https://i.postimg.cc/bN1y6MHK/logo-Photoroom.png"
        alt="Logo"
        style={{
          maxWidth: "62%",
          maxHeight: "62%",
          objectFit: "contain",
          filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.45))",
          animation: "screenSaverPulse 2.6s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes screenSaverPulse {
          0% { transform: scale(0.98); }
          25% { transform: scale(1.04); }
          40% { transform: scale(0.99); }
          55% { transform: scale(1.06); }
          70% { transform: scale(1.01); }
          100% { transform: scale(0.98); }
        }
      `}</style>
    </div>
  );
}
