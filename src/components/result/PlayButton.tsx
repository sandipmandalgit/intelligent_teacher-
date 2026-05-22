"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayButtonProps {
  /** The text to read aloud. */
  text: string;
  /** BCP-47 language tag, e.g. "en-IN", "bn-IN", "hi-IN". */
  lang: string;
  /** Human-readable language name, used in the fallback toast. */
  voiceName: string;
}

/**
 * A small "play / stop" button that reads text aloud via the Web Speech API.
 *
 * If no voice for a non-English language is installed, it shows a friendly
 * toast instead of failing silently — Bengali and Hindi voices are commonly
 * missing on desktop browsers.
 */
export function PlayButton({ text, lang, voiceName }: PlayButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  function handleClick() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Audio playback isn't supported in this browser.");
      return;
    }

    const synth = window.speechSynthesis;

    // Toggle off if already speaking.
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    if (!text.trim()) {
      toast("There's no feedback text to read aloud.");
      return;
    }

    const prefix = lang.split("-")[0].toLowerCase();
    // getVoices() can briefly return [] before the engine warms up — fall
    // back to whatever the voiceschanged listener last captured.
    const live = synth.getVoices();
    const pool = live.length > 0 ? live : voices;
    const matches = pool.filter((v) =>
      v.lang.toLowerCase().startsWith(prefix),
    );

    // Graceful fallback: a non-English voice the device doesn't have.
    if (prefix !== "en" && matches.length === 0) {
      toast(
        `${voiceName} voice not installed on this device — please install a ${voiceName} TTS voice in your browser settings.`,
      );
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    if (matches[0]) utterance.voice = matches[0];
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={speaking ? "Stop audio" : "Play audio feedback"}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        speaking
          ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card text-foreground hover:bg-secondary",
      )}
    >
      {speaking ? (
        <Square className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Volume2 className="h-3.5 w-3.5" aria-hidden />
      )}
      {speaking ? "Stop" : "Play"}
    </button>
  );
}
