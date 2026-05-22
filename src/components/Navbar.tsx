"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Backpack,
  BookOpenCheck,
  ChevronDown,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthState {
  role: "teacher" | "student" | null;
  label: string; // teacher name, or student roll number
}

/* ----------------------------- Sub-components -------------------------- */

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      {children}
    </Link>
  );
}

function MenuButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
    >
      {children}
    </button>
  );
}

/** A click-to-open dropdown menu with a full-screen click-away backdrop. */
function NavMenu({
  trigger,
  open,
  onToggle,
  onClose,
  children,
}: {
  trigger: ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex max-w-[11rem] items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          open
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <span className="truncate">{trigger}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
            aria-hidden
          />
          <div className="absolute right-0 z-50 mt-1 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------- Navbar ------------------------------- */

/** Shared top navigation — rendered once in the root layout for all pages. */
export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthState>({ role: null, label: "" });
  const [openMenu, setOpenMenu] = useState<"teacher" | "student" | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const tRes = await fetch("/api/teacher/me");
      if (tRes.ok) {
        const d = await tRes.json().catch(() => null);
        if (d?.ok) {
          setAuth({ role: "teacher", label: d.teacher?.name ?? "Teacher" });
          return;
        }
      }
      const sRes = await fetch("/api/student/me");
      if (sRes.ok) {
        const d = await sRes.json().catch(() => null);
        if (d?.ok) {
          setAuth({
            role: "student",
            label: d.student?.roll_number ?? "Student",
          });
          return;
        }
      }
      setAuth({ role: null, label: "" });
    } catch {
      setAuth({ role: null, label: "" });
    }
  }, []);

  // Re-check on every route change so the nav reflects login/logout.
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth, pathname]);

  async function handleLogout() {
    const endpoint =
      auth.role === "student"
        ? "/api/student/logout"
        : "/api/teacher/logout";
    await fetch(endpoint, { method: "POST" }).catch(() => {});
    setAuth({ role: null, label: "" });
    setOpenMenu(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md print:hidden">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <BookOpenCheck className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Shikshak<span className="text-primary">Sathi</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Teacher menu — hidden when signed in as a student. */}
          {auth.role !== "student" && (
            <NavMenu
              trigger={
                auth.role === "teacher" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    {auth.label}
                  </span>
                ) : (
                  "Teacher"
                )
              }
              open={openMenu === "teacher"}
              onToggle={() =>
                setOpenMenu((m) => (m === "teacher" ? null : "teacher"))
              }
              onClose={() => setOpenMenu(null)}
            >
              {auth.role === "teacher" ? (
                <>
                  <MenuLink
                    href="/teacher/dashboard"
                    onClick={() => setOpenMenu(null)}
                  >
                    My Dashboard
                  </MenuLink>
                  <MenuButton onClick={handleLogout}>
                    <LogOut className="h-3.5 w-3.5" />
                    Log out
                  </MenuButton>
                </>
              ) : (
                <>
                  <MenuLink
                    href="/teacher/login"
                    onClick={() => setOpenMenu(null)}
                  >
                    Log in
                  </MenuLink>
                  <MenuLink
                    href="/teacher/signup"
                    onClick={() => setOpenMenu(null)}
                  >
                    Sign up
                  </MenuLink>
                </>
              )}
            </NavMenu>
          )}

          {/* Student menu — hidden when signed in as a teacher. */}
          {auth.role !== "teacher" && (
            <NavMenu
              trigger={
                auth.role === "student" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Backpack className="h-4 w-4 shrink-0" />
                    {auth.label}
                  </span>
                ) : (
                  "Student"
                )
              }
              open={openMenu === "student"}
              onToggle={() =>
                setOpenMenu((m) => (m === "student" ? null : "student"))
              }
              onClose={() => setOpenMenu(null)}
            >
              {auth.role === "student" ? (
                <>
                  <MenuLink
                    href="/student/dashboard"
                    onClick={() => setOpenMenu(null)}
                  >
                    My Dashboard
                  </MenuLink>
                  <MenuButton onClick={handleLogout}>
                    <LogOut className="h-3.5 w-3.5" />
                    Log out
                  </MenuButton>
                </>
              ) : (
                <MenuLink
                  href="/student/login"
                  onClick={() => setOpenMenu(null)}
                >
                  Log in
                </MenuLink>
              )}
            </NavMenu>
          )}
        </div>
      </nav>
    </header>
  );
}
