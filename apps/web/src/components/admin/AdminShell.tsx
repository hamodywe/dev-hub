"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  X,
  BookOpen,
  KanbanSquare,
  Users,
  ShieldCheck,
} from "lucide-react";
import { auth, clientApi, AUTH_EXPIRED_EVENT } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Spinner, ToastProvider } from "./ui";
import { Logo } from "@/components/ui/Logo";
import { AdminSession, hasPermission, type AdminUser } from "./AdminSession";

const NAV = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard, permission: "" },
  {
    href: "/admin/projects",
    label: "المشاريع",
    icon: Briefcase,
    permission: "projects:read",
  },
  {
    href: "/admin/services",
    label: "الخدمات",
    icon: Sparkles,
    permission: "services:read",
  },
  {
    href: "/admin/articles",
    label: "المقالات",
    icon: BookOpen,
    permission: "articles:read",
  },
  {
    href: "/admin/tasks",
    label: "التاسكات",
    icon: KanbanSquare,
    permission: "tasks:read",
  },
  {
    href: "/admin/messages",
    label: "الرسائل",
    icon: MessageSquare,
    permission: "messages:read",
  },
  {
    href: "/admin/users",
    label: "الأدمن والصلاحيات",
    icon: Users,
    permission: "users:read",
  },
  {
    href: "/admin/settings",
    label: "الإعدادات",
    icon: Settings,
    permission: "settings:read",
  },
];

/** Shared brand identity across the public site and content workspace. */
function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex flex-col items-start gap-2">
      <Logo />
      {!compact && <span className="text-xs text-muted">لوحة التحكم</span>}
    </span>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [user, setUser] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const expired = () => { setUser(null); router.replace("/admin/login"); };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
  }, [router]);

  const refresh = useCallback(async () => {
    const profile = await clientApi<AdminUser>("/auth/me");
    setUser(profile);
  }, []);
  const can = useCallback(
    (permission: string) => hasPermission(user, permission),
    [user],
  );

  useEffect(() => {
    if (isLogin) return;
    if (!auth.token) {
      router.replace("/admin/login");
      return;
    }
    let active = true;
    clientApi<AdminUser>("/auth/me")
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => router.replace("/admin/login"));
    return () => {
      active = false;
    };
  }, [isLogin, router, pathname]);

  useEffect(() => {
    if (isLogin) return;
    const onFocus = () => {
      refresh().catch(() => router.replace("/admin/login"));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isLogin, refresh, router]);

  useEffect(() => {
    if (!user || isLogin || !can("messages:read")) return;
    clientApi<{ count: number }>("/messages/unread-count")
      .then((r) => setUnread(r.count))
      .catch(() => {});
  }, [user, isLogin, pathname, can]);

  if (isLogin) return <ToastProvider>{children}</ToastProvider>;
  if (!user)
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.filter((n) => !n.permission || can(n.permission)).map((n) => {
        const active =
          n.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand/15 text-fg"
                : "text-muted hover:bg-white/5 hover:text-fg",
            )}
          >
            <n.icon className={cn("size-4.5", active && "text-brand-2")} />
            {n.label}
            {n.href === "/admin/messages" && unread > 0 && (
              <span className="ms-auto rounded-full bg-brand px-2 py-0.5 font-display text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const bottom = (
    <div className="mt-auto space-y-1 border-t border-line pt-3">
      <div className="mb-3 px-3.5 text-sm">
        <p className="font-semibold">{user.displayName || user.username}</p>
        <p className="mt-1 text-xs text-muted">
          {user.role === "owner" ? "مالك الحساب" : "أدمن"}
        </p>
      </div>
      <a
        href="/ar"
        target="_blank"
        className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-fg"
      >
        <ExternalLink className="size-4.5" />
        عرض الموقع
      </a>
      <button
        onClick={() => {
          auth.clear();
          setUser(null);
          router.replace("/admin/login");
        }}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-danger hover:bg-danger/10"
      >
        <LogOut className="size-4.5" />
        تسجيل الخروج
      </button>
    </div>
  );

  return (
    <AdminSession.Provider value={{ user, can, refresh }}>
      <ToastProvider>
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-surface p-4 md:flex">
            <Link href="/admin" className="mb-6 px-2">
              <Brand />
            </Link>
            {nav}
            {bottom}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur md:hidden">
              <Link href="/admin">
                <Brand compact />
              </Link>
              <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={open}
                className="grid size-9 place-items-center rounded-lg border border-line"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </header>
            {open && (
              <div
                className="fixed inset-0 z-30 bg-bg/60 backdrop-blur-sm md:hidden"
                onClick={() => setOpen(false)}
              >
                <aside
                  className="flex h-full w-72 flex-col bg-surface p-4 pt-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {nav}
                  {bottom}
                </aside>
              </div>
            )}
            <main className="min-w-0 flex-1 p-4 md:p-8">
              <div className={pathname === "/admin/tasks" ? "mx-auto w-full" : "mx-auto max-w-6xl"}>
                {(() => {
                  const route = NAV.find(
                    (n) => n.href !== "/admin" && pathname.startsWith(n.href),
                  );
                  const editing = /^\/admin\/(projects|articles)\/new\/?$/.test(
                    pathname,
                  );
                  const permission = route?.permission.replace(
                    ":read",
                    editing ? ":write" : ":read",
                  );
                  return permission && !can(permission) ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-line p-10 text-center"
                    >
                      <ShieldCheck className="mx-auto mb-4 size-9 text-brand-2" />
                      <h1 className="text-xl font-bold">
                        هذه الصفحة خارج صلاحيات حسابك
                      </h1>
                      <p className="mt-2 text-muted">
                        تواصل مع مالك الحساب لتعديل صلاحياتك.
                      </p>
                      <Link
                        href="/admin"
                        className="mt-6 inline-block text-brand-2"
                      >
                        العودة للنظرة العامة
                      </Link>
                    </div>
                  ) : (
                    children
                  );
                })()}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </AdminSession.Provider>
  );
}
