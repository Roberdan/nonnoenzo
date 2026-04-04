"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVoice, type ConnectionState } from "@/hooks/use-voice";
import type { Compagno } from "@/lib/compagno";

export default function Home() {
  const [nome, setNome] = useState("");
  const [phase, setPhase] = useState<"nome" | "chiamata">("nome");
  const [compagno, setCompagno] = useState<Compagno>("bruno");
  const voice = useVoice();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const ringAudioRef = useRef<AudioContext | null>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [voice.transcript]);

  // Ring sound effect — 3 squilli come un telefono vero
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

        const startTime = ctx.currentTime + i * 2.5;
        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 1.5);
        osc2.stop(startTime + 1.5);
      }
    } catch {
      // Audio not available, that's ok
    }
  }, []);

  const stopRing = useCallback(() => {
    if (ringAudioRef.current) {
      ringAudioRef.current.close();
      ringAudioRef.current = null;
    }
  }, []);

  // Stop ring when connected or error
  useEffect(() => {
    if (voice.connectionState === "connected" || voice.connectionState === "error") {
      stopRing();
    }
  }, [voice.connectionState, stopRing]);

  const handleChiama = async (chi: Compagno) => {
    setCompagno(chi);
    setPhase("chiamata");
    playRing();
    await voice.connect(nome.trim(), chi);
  };

  const handleRiaggancia = () => {
    stopRing();
    voice.disconnect();
    setPhase("nome");
  };

  // ── Schermata: Inserisci il nome ──
  if (phase === "nome") {
    return (
      <main className="flex flex-col items-center gap-8 w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold leading-tight">
          Ciao!<br />Come ti chiami?
        </h1>

        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Scrivi il tuo nome..."
          autoFocus
          className="w-full text-center text-3xl py-5 px-6 rounded-2xl border-3 border-gray-300 
                     focus:border-blue-500 focus:outline-none bg-white"
          onKeyDown={(e) => {
            if (e.key === "Enter" && nome.trim()) handleChiama("bruno");
          }}
        />

        {nome.trim() && (
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={() => handleChiama("bruno")}
              className="w-full py-6 text-3xl font-bold text-white rounded-2xl
                         bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all
                         shadow-lg hover:shadow-xl"
            >
              📞 Chiama Bruno
            </button>
            <button
              onClick={() => handleChiama("rita")}
              className="w-full py-6 text-3xl font-bold text-white rounded-2xl
                         bg-pink-500 hover:bg-pink-600 active:scale-95 transition-all
                         shadow-lg hover:shadow-xl"
            >
              📞 Chiama Rita
            </button>
          </div>
        )}

        {voice.error && (
          <p className="text-red-600 text-xl mt-4">{voice.error}</p>
        )}
      </main>
    );
  }

  // ── Schermata: Telefonata in corso ──
  const compagnoNome = compagno === "bruno" ? "Bruno" : "Rita";

  return (
    <main className="flex flex-col items-center w-full max-w-lg min-h-screen py-8">
      {/* Header chiamata */}
      <div className="text-center mb-6">
        <p className="text-2xl text-gray-500">
          {voice.connectionState === "connected" ? "In chiamata con" : "Sto chiamando"}
        </p>
        <h2 className="text-5xl font-bold mt-1">{compagnoNome}</h2>
        <CallStatus
          state={voice.connectionState}
          isSpeaking={voice.isSpeaking}
          isListening={voice.isListening}
        />
      </div>

      {/* Trascrizione */}
      <div className="flex-1 w-full overflow-y-auto mb-6 space-y-4 min-h-[200px] max-h-[50vh]">
        {voice.transcript.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-5 py-3 rounded-2xl text-xl leading-relaxed ${
                entry.role === "user"
                  ? "bg-blue-100 text-blue-900"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {entry.role === "assistant" && (
                <span className="font-bold">{compagnoNome}: </span>
              )}
              {entry.text}
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Bottone riaggancia */}
      <button
        onClick={handleRiaggancia}
        className="w-40 h-40 rounded-full bg-red-600 hover:bg-red-700 active:scale-90
                   text-white text-xl font-bold shadow-2xl transition-all
                   flex flex-col items-center justify-center mb-8"
      >
        <span className="text-4xl">📵</span>
        Chiudi
      </button>

      {voice.error && (
        <p className="text-red-600 text-xl mt-4">{voice.error}</p>
      )}
    </main>
  );
}

function CallStatus({
  state,
  isSpeaking,
  isListening,
}: {
  state: ConnectionState;
  isSpeaking: boolean;
  isListening: boolean;
}) {
  if (state === "ringing") {
    return (
      <p className="text-xl text-gray-400 mt-3 animate-pulse">
        🔔 Sta squillando...
      </p>
    );
  }
  if (state === "connecting") {
    return (
      <p className="text-xl text-yellow-600 mt-3 animate-pulse">
        Connessione in corso...
      </p>
    );
  }
  if (state === "error") {
    return (
      <p className="text-xl text-red-600 mt-3">
        Errore di connessione
      </p>
    );
  }
  if (state === "connected") {
    if (isSpeaking) {
      return (
        <p className="text-xl text-green-600 mt-3" style={{ animation: "speaking-pulse 1.5s ease-in-out infinite" }}>
          🗣️ Sta parlando...
        </p>
      );
    }
    if (isListening) {
      return (
        <p className="text-xl text-blue-600 mt-3">
          👂 Ti sta ascoltando...
        </p>
      );
    }
    return (
      <p className="text-xl text-green-600 mt-3">
        ✅ Connesso
      </p>
    );
  }
  return null;
}
