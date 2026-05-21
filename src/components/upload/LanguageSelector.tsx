"use client";

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Language = "bengali" | "hindi" | "english";

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
}

const LANGUAGES: { id: Language; label: string; bengali?: boolean }[] = [
  { id: "english", label: "English" },
  { id: "bengali", label: "বাংলা", bengali: true },
  { id: "hindi", label: "हिन्दी" },
];

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LANGUAGES.map((lang) => {
        const active = value === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => onChange(lang.id)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            <span className={cn(lang.bengali && "font-bengali")}>
              {lang.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
