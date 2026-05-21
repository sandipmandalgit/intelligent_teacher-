"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpenCheck, ScanLine, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Shikshak<span className="text-primary">Sathi</span>
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/#upload"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Grade
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Dashboard
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          {/* Soft decorative glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-160px] -z-10 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
          />

          <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-20 text-center sm:px-6 sm:pt-28 lg:pt-32">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <Badge
                variant="secondary"
                className="mb-6 gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Built for India&apos;s classrooms ·{" "}
                <span className="font-bengali">বাংলায় feedback</span>
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Grade an answer sheet in{" "}
              <span className="text-primary">10 seconds</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
              className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground sm:text-xl"
            >
              AI-powered grading with feedback in Bengali — built for
              India&apos;s teachers.
            </motion.p>
          </div>
        </section>

        {/* Upload placeholder */}
        <section
          id="upload"
          className="mx-auto w-full max-w-2xl scroll-mt-24 px-4 pb-24 sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
          >
            <Card className="rounded-2xl border-border/70 p-2 shadow-xl shadow-primary/10">
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ScanLine className="h-7 w-7" />
                </span>
                <p className="text-base font-semibold text-foreground">
                  Upload section — coming in Step 4
                </p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Soon you&apos;ll snap a photo of a handwritten answer sheet
                  and get it graded instantly.
                </p>
              </div>
            </Card>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 ShikshakSathi</p>
          <p>Powered by Google Gemini 2.5 Pro</p>
        </div>
      </footer>
    </div>
  );
}
