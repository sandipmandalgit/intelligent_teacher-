"use client";

import { Camera, Hand, ImageOff, Smartphone, Sun, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BlurryImageDialogProps {
  open: boolean;
  filenames: string[];
  onGradeAnyway: () => void;
  onRetake: () => void;
}

const TIPS = [
  { icon: Sun, text: "Better lighting — use daylight or a bright lamp" },
  { icon: Smartphone, text: "Hold the phone flat over the paper" },
  { icon: Hand, text: "Steady hand — or rest the phone on something" },
];

/**
 * A styled replacement for the native window.confirm() blur warning.
 * Shown on the grade page when the client-side blur check flags one or
 * more uploaded photos as too blurry to grade reliably.
 */
export function BlurryImageDialog({
  open,
  filenames,
  onGradeAnyway,
  onRetake,
}: BlurryImageDialogProps) {
  const count = filenames.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing the dialog (Esc / overlay / X) counts as "retake".
        if (!next) onRetake();
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        {/* Header with warning badge */}
        <div className="bg-gradient-to-b from-amber-50 to-transparent px-6 pb-2 pt-6">
          <DialogHeader>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 ring-8 ring-amber-500/[0.06]">
              <TriangleAlert className="h-7 w-7" />
            </span>
            <DialogTitle className="mt-3 text-xl">
              Image quality warning
            </DialogTitle>
            <DialogDescription>
              {count} {count === 1 ? "image appears" : "images appear"} to be
              blurry. Blurry photos may produce inaccurate grades.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-4">
          {/* Blurry file list */}
          <ul className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-50/60 p-3">
            {filenames.map((name) => (
              <li key={name} className="flex items-center gap-2 text-sm">
                <ImageOff className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="truncate font-medium text-foreground">
                  {name}
                </span>
              </li>
            ))}
          </ul>

          {/* Retake tips */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              For best results, retake them with
            </p>
            <ul className="mt-2.5 space-y-2.5">
              {TIPS.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2.5 text-sm text-foreground"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 bg-secondary/40 px-6 py-4 sm:gap-2">
          <Button variant="outline" onClick={onGradeAnyway}>
            Grade anyway
          </Button>
          <Button onClick={onRetake}>
            <Camera />
            Retake photos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
