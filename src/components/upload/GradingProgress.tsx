"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const MESSAGES = [
  "Reading your answer script…",
  "Analyzing student answers…",
  "Evaluating against rubrics…",
  "Generating feedback in your language…",
  "Almost there — finalizing scores…",
];

interface GradingProgressProps {
  isOpen: boolean;
}

export function GradingProgress({ isOpen }: GradingProgressProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl"
          >
            {/* Spinner: fast inner loader + slow rotating dashed ring */}
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
            </div>

            {/* Cycling status message */}
            <div className="flex min-h-[3.5rem] items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.h3
                  key={messageIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="text-lg font-semibold text-foreground"
                >
                  {MESSAGES[messageIndex]}
                </motion.h3>
              </AnimatePresence>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              This usually takes 10–25 seconds.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
