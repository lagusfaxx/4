"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, resolveMediaUrl } from "../lib/api";
import CreatePostModal from "./CreatePostModal";
import Avatar from "./Avatar";
import useMe from "../hooks/useMe";

type Notification = {
  id: string;
  type: string;
  data: any;
  createdAt: string;
  readAt: string | null;
};

// Navigation item types (avoid TS union inference issues)
type NavItem = { href: string; label: string; icon: "home" | "reels" | "services" };
type SecondaryItem = { label: string; icon: "search" | "bell" | "chat" | "plus"; href?: string; action?: () => void; badge?: number };

function Icon({ name }: { name: "home" | "reels" | "services" | "search" | "bell" | "chat" | "plus" | "settings" | "user" }) {
  const common = "h-5 w-5";
  switch (name) {
    case "home":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5Z" />
        </svg>
      );
    case "reels":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M8 4l4 6M13 4l4 6" />
          <path d="M10 11l5 3-5 3v-6Z" />
        </svg>
      );
    case "services":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
          <path d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        </svg>
      );
    case "search":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "bell":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z" />
          <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        </svg>
      );
    case "chat":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        </svg>
      );
    case "plus":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "user":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 21a8 8 0 0 0-16 0" />
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
        </svg>
      );
    case "settings":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a7.8 7.8 0 0 0-1.7-1l-.4-2.7H11l-.4 2.7a7.8 7.8 0 0 0-1.7 1l-2.5-1-2 3.4L6.5 13a7.9 7.9 0 0 0-.1 1c0 .34.03.67.1 1l-2.1 1.6 2 3.4 2.5-1c.52.4 1.09.74 1.7 1l.4 2.7h4l.4-2.7c.61-.26 1.18-.6 1.7-1l2.5 1 2-3.4-2.1-1.6Z" />
        </svg>
      );
  }
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[11px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading } = useMe();

  const isAuthed = !!me?.user;

  const requireAuth = (fn?: () => void, nextPath?: string) => {
    if (loading) return;
    if (!me?.user) {
      const next = encodeURIComponent(nextPath ?? pathname ?? "/");
      router.push(`/login?next=${next}`);
      return;
    }
    fn?.();
  };

  const [collapsed, setCollapsed] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadChats, setUnreadChats] = useState(0);
  const unreadNotifs = useMemo(() => notifs.filter((n) => !n.readAt).length, [notifs]);

  // Persist collapse
  useEffect(() => {
    try {
      const v = localStorage.getItem("uzeed_sidebar_collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("uzeed_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    if (!me?.user) return;
    const tick = async () => {
      try {
        const [n, inbox] = await Promise.all([
          apiFetch<{ notifications: Notification[] }>("/notifications"),
          apiFetch<{ conversations: { unreadCount: number }[] }>("/messages/inbox")
        ]);
        setNotifs(n.notifications);
        setUnreadChats(inbox.conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0));
      } catch {
        // keep UI silent; pages handle their own errors
      }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [me?.user?.id]);

  const items: NavItem[] = [
    { href: "/inicio", label: "Inicio", icon: "home" as const },
    { href: "/reels", label: "Reels", icon: "reels" as const },
    { href: "/servicios", label: "Servicios", icon: "services" as const },
  ];

  const secondary: SecondaryItem[] = [
    { action: () => setSearchOpen(true), label: "Buscar", icon: "search" as const },
    { action: () => requireAuth(() => setNotifsOpen((o) => !o)), label: "Notificaciones", icon: "bell" as const, badge: unreadNotifs },
    { action: () => requireAuth(() => router.push("/chats"), "/chats"), label: "Mensajes", icon: "chat" as const, badge: unreadChats },
    { action: () => requireAuth(() => setCreateOpen(true)), label: "Crear", icon: "plus" as const },
  ];

  const profileHref = me?.user?.username ? `/perfil/${me.user.username}` : "/inicio";
  const nextToLogin = `/login?next=${encodeURIComponent(pathname || "/inicio")}`;
  const nextToRegister = `/register?next=${encodeURIComponent(pathname || "/inicio")}`;

  async function doLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    try {
      // next/navigation router has refresh() in App Router
      router.refresh();
    } catch {
      // ignore
    }
    router.push("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex h-screen sticky top-0 ${collapsed ? "w-[88px]" : "w-[280px]"} shrink-0 flex-col border-r border-white/10 bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30`}>
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/inicio" className="flex items-center gap-2">
            <img
              src="/brand/isotipo.png"
              alt="UZEED"
              className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5 object-cover"
            />
            {!collapsed ? (
              <span className="text-sm font-semibold tracking-[0.25em] text-white/90">UZEED</span>
            ) : null}
          </Link>
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:border-white/20"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Colapsar"
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="px-2">
          <div className="grid gap-1">
            {items.map((it) => {
              const active = pathname?.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
                >
                  <span className={`text-white/90 ${active ? "" : "text-white/75"}`}>
                    <Icon name={it.icon} />
                  </span>
                  {!collapsed ? <span className="font-medium">{it.label}</span> : null}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 border-t border-white/10 pt-3 grid gap-1">
            {secondary.map((it) => {
              const key = it.label;
              const active = it.href ? pathname?.startsWith(it.href) : false;
              const content = (
                <>
                  <span className={`text-white/90 ${active ? "" : "text-white/75"}`}>
                    <Icon name={it.icon} />
                  </span>
                  {!collapsed ? <span className="font-medium">{it.label}</span> : null}
                  {!collapsed && typeof it.badge === "number" ? <Badge count={it.badge} /> : null}
                </>
              );
              if (it.href) {
                return (
                  <Link
                    key={key}
                    href={it.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${active ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    {content}
                  </Link>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={it.action}
                  className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition hover:bg-white/5"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mt-auto p-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            {me?.user ? (
              <>
                <Link href={profileHref} className="flex items-center gap-3">
                  <Avatar src={me.user.avatarUrl} alt={me.user.username} size={36} className="border-white/15" />
                  {!collapsed ? (
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{me.user.displayName || me.user.username}</div>
                      <div className="text-xs text-white/60 truncate">@{me.user.username}</div>
                    </div>
                  ) : null}
                </Link>
                <div className="mt-2 grid gap-1">
                  <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-white/5">
                    <span className="text-white/75">
                      <Icon name="settings" />
                    </span>
                    {!collapsed ? <span>Configuración</span> : null}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await apiFetch("/auth/logout", { method: "POST" });
                      } finally {
                        router.push("/login");
                        router.refresh();
                      }
                    }}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-white/80 hover:bg-white/5"
                  >
                    <span className="text-white/75">⎋</span>
                    {!collapsed ? <span>Cerrar sesión</span> : null}
                  </button>
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Link href={nextToLogin} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-white/5">
                  <span className="text-white/75">
                    <Icon name="user" />
                  </span>
                  {!collapsed ? <span>Iniciar sesión</span> : null}
                </Link>
                {!collapsed ? (
                  <div className="text-xs text-white/50 px-2">
                    Inicia sesión para publicar, chatear y ver notificaciones.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/35 backdrop-blur-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-[520px] grid-cols-5 px-3 py-2">
          <Link className="flex flex-col items-center justify-center gap-1 py-1 text-xs" href="/inicio">
            <Icon name="home" />
          </Link>
          <Link className="flex flex-col items-center justify-center gap-1 py-1 text-xs" href="/reels">
            <Icon name="reels" />
          </Link>
          <button
            onClick={() => requireAuth(() => setCreateOpen(true))}
            className="flex flex-col items-center justify-center gap-1 py-1 text-xs"
            type="button"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-gradient-to-br from-fuchsia-500/90 to-violet-600/90 shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
              <Icon name="plus" />
            </span>
          </button>
          <button onClick={() => requireAuth(() => router.push("/chats"), "/chats")} className="relative flex flex-col items-center justify-center gap-1 py-1 text-xs" type="button">
            <Icon name="chat" />
            {unreadChats ? <span className="absolute right-4 top-1 h-2 w-2 rounded-full bg-fuchsia-500" /> : null}
          </button>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 text-xs"
            type="button"
          >
            <Icon name="user" />
          </button>
        </div>
      </div>

      {/* Mobile account menu (must also work when not logged in) */}
      {mobileMenuOpen ? (
        <ModalShell title="Cuenta" onClose={() => setMobileMenuOpen(false)}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="h-11 w-11 overflow-hidden rounded-full border border-white/10 bg-black/20">
                {me?.user?.avatarUrl ? (
                  <img
                    src={resolveMediaUrl(me.user.avatarUrl) ?? undefined}
                    alt={me.user.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-white/60">?</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{me?.user?.displayName ?? "Invitado"}</div>
                <div className="truncate text-xs text-white/60">
                  {me?.user?.username ? `@${me.user.username}` : "Sin sesión"}
                </div>
              </div>
            </div>

            {me?.user ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push(profileHref);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  Mi perfil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/servicios");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  Servicios
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/dashboard");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  Configuración
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await doLogout();
                  }}
                  className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-sm text-red-100 hover:bg-red-500/20"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push(nextToLogin);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  Iniciar sesión
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push(nextToRegister);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  Crear cuenta
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/servicios");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white hover:bg-white/10"
                >
                  Servicios
                </button>
              </div>
            )}
          </div>
        </ModalShell>
      ) : null}

      {/* Search modal */}
      {searchOpen ? <SearchModal onClose={() => setSearchOpen(false)} /> : null}

      {/* Notifications panel */}
      {notifsOpen ? <NotificationsPanel notifications={notifs} onClose={() => setNotifsOpen(false)} /> : null}

      <CreatePostModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => null} />
    </>
  );
}

function ModalShell({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-10" onMouseDown={onClose}>
      <div
        className="w-full max-w-[560px] rounded-3xl border border-white/10 bg-zinc-950/90 p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-2 py-1">
          <div className="text-sm font-semibold">{title}</div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Cerrar
          </button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; profileType: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const query = q.trim();
      if (!query) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await apiFetch<{ profiles: any[] }>(`/profiles?q=${encodeURIComponent(query)}`);
        setResults(res.profiles);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <ModalShell title="Buscar" onClose={onClose}>
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <input
          autoFocus
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          placeholder="Buscar perfiles, @usuario, nombre..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-3 grid gap-2">
        {loading ? <div className="text-xs text-white/60 px-1">Buscando…</div> : null}
        {results.map((p) => (
          <Link
            key={p.id}
            href={`/perfil/${p.username}`}
            onClick={onClose}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:border-white/20"
          >
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/10">
              {p.avatarUrl ? <img src={resolveMediaUrl(p.avatarUrl) || ""} alt={p.username} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{p.displayName || p.username}</div>
              <div className="text-xs text-white/60 truncate">@{p.username}</div>
            </div>
          </Link>
        ))}
        {!loading && q.trim() && !results.length ? <div className="text-xs text-white/60 px-1">Sin resultados</div> : null}
      </div>
    </ModalShell>
  );
}

function NotificationsPanel({ notifications, onClose }: { notifications: Notification[]; onClose: () => void }) {
  const router = useRouter();
  return (
    <ModalShell title="Notificaciones" onClose={onClose}>
      <div className="grid gap-2 max-h-[460px] overflow-y-auto pr-1">
        {notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={async () => {
              try {
                await apiFetch(`/notifications/${n.id}/read`, { method: "POST" });
              } catch {}
              onClose();
              router.refresh();
            }}
            className={`text-left rounded-2xl border border-white/10 px-4 py-3 ${n.readAt ? "bg-white/5" : "bg-white/10"}`}
          >
            <div className="text-sm font-semibold">{labelForNotification(n)}</div>
            <div className="mt-1 text-xs text-white/60">{new Date(n.createdAt).toLocaleString("es-CL")}</div>
          </button>
        ))}
        {!notifications.length ? <div className="text-sm text-white/60 px-1">Aún no tienes notificaciones.</div> : null}
      </div>
    </ModalShell>
  );
}

function labelForNotification(n: Notification): string {
  switch (n.type) {
    case "MESSAGE_RECEIVED":
      return "Nuevo mensaje";
    case "POST_LIKED":
      return "Like en tu publicación";
    case "NEW_FOLLOWER":
      return "Nuevo seguidor";
    case "SUBSCRIPTION_CREATED":
      return "Nueva suscripción";
    default:
      return "Actividad";
  }
}
