"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVoice, type ConnectionState } from "@/hooks/use-voice";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

export default function Home() {
  const [nome, setNome] = useState("");
  const [nomeConfermato, setNomeConfermato] = useState(false);
  const [phase, setPhase] = useState<"nome" | "home" | "chiamata">("nome");
  const voice = useVoice();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const ringAudioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = getCookie("nonnoenzo-nome");
    if (saved) {
      setNome(saved);
      setNomeConfermato(true);
      setPhase("home");
    }
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [voice.transcript]);

  const playRing = useCallback(async () => {
    try {
      const ctx = new AudioContext();
      ringAudioRef.current = ctx;
      for (let i = 0; i < 3; i++) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.value = 0.12;
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 2.5;
        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 1.5);
        osc2.stop(t + 1.5);
      }
    } catch { /* ok */ }
  }, []);

  const stopRing = useCallback(() => {
    if (ringAudioRef.current) {
      ringAudioRef.current.close();
      ringAudioRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (voice.connectionState === "connected" || voice.connectionState === "error") {
      stopRing();
    }
  }, [voice.connectionState, stopRing]);

  const handleConfermaNome = () => {
    if (!nome.trim()) return;
    setCookie("nonnoenzo-nome", nome.trim(), 365);
    setNomeConfermato(true);
    setPhase("home");
  };

  const handleChiama = async () => {
    setPhase("chiamata");
    playRing();
    await voice.connect(nome.trim(), "marcello");
  };

  const handleRiaggancia = async () => {
    stopRing();
    // Save transcript to DB before disconnecting
    if (voice.transcript.length > 0) {
      try {
        await fetch("/api/conversazioni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            compagno: "marcello",
            messaggi: voice.transcript.map((t) => ({
              ruolo: t.role,
              contenuto: t.text,
            })),
          }),
        });
      } catch {
        // Non-blocking — don't fail the hang up
      }
    }
    voice.disconnect();
    setPhase("home");
  };

  // ── Schermata 1: Come ti chiami? ──
  if (phase === "nome" && !nomeConfermato) {
    return (
      <main className="flex flex-col items-center justify-center gap-8 w-full max-w-md text-center min-h-screen px-6">
        <div className="text-6xl mb-2">👋</div>
        <h1 className="text-4xl font-bold leading-tight">
          Ciao!<br />Come ti chiami?
        </h1>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Il tuo nome..."
          autoFocus
          className="w-full text-center text-3xl py-5 px-6 rounded-2xl border-3 border-gray-300 
                     focus:border-blue-500 focus:outline-none bg-white"
          onKeyDown={(e) => { if (e.key === "Enter") handleConfermaNome(); }}
        />
        {nome.trim() && (
          <button
            onClick={handleConfermaNome}
            className="w-full py-5 text-2xl font-bold text-white rounded-2xl
                       bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-lg"
          >
            ✅ Sono {nome.trim()}
          </button>
        )}
      </main>
    );
  }

  // ── Schermata 2: Home — chiama Marcello ──
  if (phase === "home") {
    return (
      <main className="flex flex-col items-center justify-center gap-8 w-full max-w-md text-center min-h-screen px-6">
        <p className="text-2xl text-gray-500">Ciao {nome}!</p>

        <button
          onClick={handleChiama}
          className="w-full flex items-center gap-5 p-6 rounded-2xl bg-white border-2 border-gray-200
                     hover:border-green-400 hover:bg-green-50 active:scale-95 transition-all shadow-lg"
        >
          <span className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-6xl shrink-0">
            👴
          </span>
          <div className="text-left flex-1">
            <p className="text-3xl font-bold text-gray-900">Marcello</p>
            <p className="text-lg text-gray-500">Ex maestro marchigiano, 72 anni</p>
          </div>
          <span className="text-5xl">📞</span>
        </button>

        <p className="text-lg text-gray-400">Premi per chiamare</p>

        {voice.error && (
          <p className="text-red-600 text-xl mt-2">{voice.error}</p>
        )}
      </main>
    );
  }

  // ── Schermata 3: Telefonata in corso ──
  const isRinging = voice.connectionState === "ringing" || voice.connectionState === "connecting";

  return (
    <main className="flex flex-col items-center w-full max-w-md min-h-screen px-6 py-8">
      <div className="text-center mb-4">
        <div className={`text-8xl mb-3 ${voice.isSpeaking ? "animate-bounce" : ""}`}>👴</div>
        <h2 className="text-4xl font-bold">Marcello</h2>
        <CallStatus
          state={voice.connectionState}
          isSpeaking={voice.isSpeaking}
          isListening={voice.isListening}
        />
      </div>

      <div className="flex-1 w-full overflow-y-auto mb-6 space-y-3 min-h-[150px] max-h-[45vh]">
        {voice.transcript.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-xl leading-relaxed ${
                entry.role === "user"
                  ? "bg-blue-100 text-blue-900 rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
              }`}
            >
              {entry.role === "assistant" && <span className="font-bold">Marcello: </span>}
              {entry.text}
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      <button
        onClick={handleRiaggancia}
        className={`w-24 h-24 rounded-full shadow-2xl transition-all flex items-center justify-center
                    ${isRinging ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"} active:scale-90`}
        aria-label="Riaggancia"
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12 rotate-[135deg]">
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
        </svg>
      </button>
      <p className="text-lg text-gray-400 mt-3">
        {isRinging ? "Sta squillando..." : "Premi per riagganciare"}
      </p>

      {voice.error && <p className="text-red-600 text-xl mt-4">{voice.error}</p>}
    </main>
  );
}

function CallStatus({ state, isSpeaking, isListening }: {
  state: ConnectionState; isSpeaking: boolean; isListening: boolean;
}) {
  if (state === "ringing") return <p className="text-xl text-gray-400 mt-2 animate-pulse">🔔 Sta squillando...</p>;
  if (state === "connecting") return <p className="text-xl text-yellow-600 mt-2 animate-pulse">Connessione...</p>;
  if (state === "error") return <p className="text-xl text-red-600 mt-2">Errore di connessione</p>;
  if (state === "connected") {
    if (isSpeaking) return <p className="text-xl text-green-600 mt-2">🗣️ Sta parlando...</p>;
    if (isListening) return <p className="text-xl text-blue-600 mt-2">👂 Ti ascolta...</p>;
    return <p className="text-xl text-green-600 mt-2">✅ In linea</p>;
  }
  return null;
}
