"use client";

import { useCallback, useRef, useState } from "react";
import {
  buildSystemPrompt,
  buildGreeting,
  getCompagnoConfig,
  SESSION_CONFIG,
  type Compagno,
} from "@/lib/enzo";

export type ConnectionState = "idle" | "ringing" | "connecting" | "connected" | "error";

interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
}

interface TokenConfig {
  azureResource?: string;
  deployment?: string;
}

export function useVoice() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantBufferRef = useRef("");
  const serverConfigRef = useRef<TokenConfig | null>(null);

  const cleanup = useCallback(() => {
    if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
    dcRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    dcRef.current = null;
    streamRef.current = null;
    heartbeatRef.current = null;
    serverConfigRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setConnectionState("idle");
    setIsSpeaking(false);
    setIsListening(false);
  }, [cleanup]);

  const connect = useCallback(
    async (nome: string, compagno: Compagno) => {
      setError(null);
      setTranscript([]);
      assistantBufferRef.current = "";

      const config = getCompagnoConfig(compagno);

      // ── Phase 1: Ringing ──
      setConnectionState("ringing");

      try {
        // Fetch server config + ephemeral token + mic in parallel
        const [tokenRes, configRes, micStream] = await Promise.all([
          fetch("/api/realtime/ephemeral-token", { method: "POST" }),
          fetch("/api/realtime/token"),
          navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          }),
        ]);

        if (!tokenRes.ok) throw new Error("Impossibile ottenere il token vocale");
        if (!configRes.ok) throw new Error("Azure non configurato");

        const tokenData = await tokenRes.json();
        const configData = await configRes.json();
        streamRef.current = micStream;
        serverConfigRef.current = configData;

        // ── Phase 2: Connecting ──
        setConnectionState("connecting");

        // Create peer connection (GA protocol: Azure provides TURN)
        const pc = new RTCPeerConnection({ iceServers: [] });
        pcRef.current = pc;

        // Add mic tracks (muted until session.updated)
        micStream.getTracks().forEach((track) => {
          track.enabled = false;
          pc.addTrack(track, micStream);
        });

        // Handle remote audio
        pc.ontrack = (event) => {
          const audio = new Audio();
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
        };

        // Create data channel BEFORE offer
        const dc = pc.createDataChannel("realtime-channel");
        dcRef.current = dc;

        // Data channel events
        dc.onopen = () => {
          // Send session config
          const sessionUpdate = {
            type: "session.update",
            session: {
              type: "realtime",
              instructions: buildSystemPrompt(config.nome, nome),
              audio: {
                output: { voice: config.voice },
                input: {
                  noise_reduction: { type: SESSION_CONFIG.noiseReduction },
                  transcription: SESSION_CONFIG.transcription,
                  turn_detection: SESSION_CONFIG.turnDetection,
                },
              },
            },
          };
          dc.send(JSON.stringify(sessionUpdate));
        };

        dc.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            handleServerEvent(msg, nome, config.nome, dc, micStream);
          } catch {
            // ignore parse errors
          }
        };

        dc.onclose = () => disconnect();

        // Create and exchange SDP
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        // GA protocol: POST SDP to Azure
        const { azureResource } = configData;
        const sdpEndpoint = `https://${azureResource}.openai.azure.com/openai/v1/realtime/calls`;

        const sdpRes = await fetch(sdpEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            Authorization: `Bearer ${tokenData.token}`,
          },
          body: offer.sdp,
        });

        if (!sdpRes.ok) throw new Error(`Connessione fallita: ${sdpRes.status}`);

        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

        // Wait for connection
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Connessione scaduta")), 15000);
          const check = () => {
            if (pc.connectionState === "connected") {
              clearTimeout(timeout);
              pc.removeEventListener("connectionstatechange", check);
              resolve();
            } else if (pc.connectionState === "failed") {
              clearTimeout(timeout);
              reject(new Error("Connessione fallita"));
            }
          };
          pc.addEventListener("connectionstatechange", check);
          check();
        });

        // Start heartbeat
        const scheduleHeartbeat = () => {
          heartbeatRef.current = setTimeout(() => {
            if (dcRef.current?.readyState === "open") {
              dcRef.current.send(JSON.stringify({ type: "session.update", session: { type: "realtime" } }));
              scheduleHeartbeat();
            }
          }, 25000 + Math.random() * 5000);
        };
        scheduleHeartbeat();

      } catch (err) {
        cleanup();
        const msg = err instanceof Error ? err.message : "Errore sconosciuto";
        if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
          setError("Per parlare con Enzo, devi permettere l'uso del microfono.");
        } else {
          setError(msg);
        }
        setConnectionState("error");
      }
    },
    [cleanup, disconnect],
  );

  // ── Server event handler ──
  const handleServerEvent = useCallback(
    (
      msg: Record<string, unknown>,
      nonnoNome: string,
      compagnoNome: string,
      dc: RTCDataChannel,
      micStream: MediaStream,
    ) => {
      switch (msg.type) {
        case "session.updated":
          // Unmute mic, send greeting
          micStream.getTracks().forEach((t) => (t.enabled = true));
          setConnectionState("connected");

          // Send greeting as conversation item + trigger response
          const greeting = buildGreeting(compagnoNome, nonnoNome);
          dc.send(JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [{ type: "input_text", text: `[Il nonno/la nonna si è appena collegato. Si chiama ${nonnoNome}. Salutalo calorosamente.]` }],
            },
          }));
          dc.send(JSON.stringify({ type: "response.create" }));
          void greeting; // greeting text used for UX, actual voice comes from Azure
          break;

        case "conversation.item.input_audio_transcription.completed": {
          const text = (msg as { transcript?: string }).transcript?.trim();
          if (text) setTranscript((prev) => [...prev, { role: "user", text }]);
          break;
        }

        case "response.audio_transcript.delta": {
          const delta = (msg as { delta?: string }).delta || "";
          assistantBufferRef.current += delta;
          break;
        }

        case "response.audio_transcript.done": {
          const text = assistantBufferRef.current.trim();
          if (text) setTranscript((prev) => [...prev, { role: "assistant", text }]);
          assistantBufferRef.current = "";
          break;
        }

        case "input_audio_buffer.speech_started":
          setIsListening(true);
          break;

        case "input_audio_buffer.speech_stopped":
          setIsListening(false);
          break;

        case "response.audio.delta":
          setIsSpeaking(true);
          break;

        case "response.done":
          setIsSpeaking(false);
          break;

        case "error": {
          const errMsg = (msg as { error?: { message?: string } }).error?.message;
          console.error("[voice] Server error:", errMsg);
          break;
        }
      }
    },
    [],
  );

  return {
    connectionState,
    transcript,
    error,
    isSpeaking,
    isListening,
    connect,
    disconnect,
  };
}
