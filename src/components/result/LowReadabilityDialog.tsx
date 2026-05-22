"use client";

import Link from "next/link";
import { Camera, ImageUp, Sun, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LowReadabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPS = [
  "Place the answer sheet flat on a table",
  "Use natural daylight or a bright desk lamp",
  "Hold the phone directly above — no tilt or angle",
  "Tap the screen to focus before taking the photo",
];

/**
 * A pop-up shown on the result page when the AI flags the uploaded answer
 * sheet as LOW readability. Poor image quality hurts grading accuracy, so
 * we nudge the teacher to re-shoot before trusting the scores.
 */
export function LowReadabilityDialog({
  open,
  onOpenChange,
}: LowReadabilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <TriangleAlert className="h-7 w-7" />
          </span>
          <DialogTitle className="mt-2">Image quality was poor</DialogTitle>
          <DialogDescription>
            Some pages were hard to read, which can lower grading accuracy.
            For reliable scores, we recommend grading again with sharper
            photos.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-amber-500/30 bg-amber-50/60 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Camera className="h-4 w-4 text-amber-600" />
            Tips for a better photo
          </p>
          <ul className="mt-2 space-y-1.5">
            {TIPS.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Sun className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            View results anyway
          </Button>
          <Button asChild>
            <Link href="/grade">
              <ImageUp />
              Re-upload Photos
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
