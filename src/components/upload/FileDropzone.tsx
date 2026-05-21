"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Plus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  label: string;
  description: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  icon?: ReactNode;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Truncates a filename to `max` characters while keeping its extension. */
function truncateName(name: string, max = 32): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name.slice(0, max - 1)}…`;
  const ext = name.slice(dot);
  const keep = Math.max(1, max - ext.length - 1);
  return `${name.slice(0, keep)}…${ext}`;
}

function isImageFile(file: File): boolean {
  if (file.type) return file.type.startsWith("image/");
  return /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name);
}

function isAcceptedType(file: File, accept: string): boolean {
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export function FileDropzone({
  label,
  description,
  accept,
  multiple = false,
  files,
  onFilesChange,
  maxFiles = 15,
  maxSizeMB = 10,
  icon,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function ingest(incoming: File[]) {
    const accepted: File[] = [];
    for (const file of incoming) {
      if (!isAcceptedType(file, accept)) {
        toast.error(`File '${file.name}' is not a supported format.`);
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(
          `File '${file.name}' is ${(file.size / (1024 * 1024)).toFixed(
            0,
          )}MB — max is ${maxSizeMB}MB.`,
        );
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;

    if (!multiple) {
      onFilesChange([accepted[0]]);
      return;
    }

    let next = [...files, ...accepted];
    if (next.length > maxFiles) {
      toast.error(`You can upload at most ${maxFiles} files.`);
      next = next.slice(0, maxFiles);
    }
    onFilesChange(next);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      ingest(Array.from(e.dataTransfer.files));
    }
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      ingest(Array.from(e.target.files));
    }
    e.target.value = "";
  }

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function openPicker() {
    inputRef.current?.click();
  }

  const hasFiles = files.length > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />

      {!hasFiles ? (
        <button
          type="button"
          onClick={openPicker}
          className={cn(
            "group flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 px-6 text-center transition-all duration-200",
            isDragging
              ? "border-solid border-primary bg-primary/5"
              : "border-dashed border-border hover:border-solid hover:border-primary hover:bg-primary/[0.03]",
          )}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
            {icon ?? <Upload className="h-6 w-6" />}
          </span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className="max-w-[16rem] text-xs text-muted-foreground">
            {description}
          </span>
          <span className="mt-1 text-xs font-medium text-primary underline underline-offset-4">
            Browse files
          </span>
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/30 p-3">
          <p className="mb-2 px-1 text-sm font-semibold text-foreground">
            {label} · {files.length} file{files.length === 1 ? "" : "s"}
          </p>

          <ul className="space-y-2">
            <AnimatePresence>
              {files.map((file, index) => (
                <motion.li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {isImageFile(file) ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {truncateName(file.name)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    aria-label={`Remove ${file.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {multiple && (
            <button
              type="button"
              onClick={openPicker}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
