"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_URL } from "../../lib/api";

type MeResponse = {
  user: { id: string; role: "USER" | "ADMIN"; displayName: string | null } | null;
};

type Post = {
  id: string;
  title: string;
  body: string;
  isPublic: boolean;
  price: number;
  createdAt: string;
  media: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
};

type ListResp = { posts: Post[] };
type StatsResp = { users: number; posts: number; payments: number };

export default function AdminPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [price, setPrice] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [creating, setCreating] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) {
      setFiles(null);
      return;
    }
    const valid = Array.from(fileList).every((file) => {
      const okType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const okSize = file.size <= 100 * 1024 * 1024;
      return okType && okSize;
    });
    if (!valid) {
      setFileError("Solo se permiten imágenes o videos (máximo 100MB).");
      return;
    }
    setFileError(null);
    setFiles(fileList);
  };

  async function load() {
    const m = await apiFetch<MeResponse>("/auth/me");
    if (!m.user) {
      window.location.href = "/login";
      return;
    }
    if (m.user.role !== "ADMIN") {
      window.location.href = "/dashboard";
      return;
    }
    setMe(m.user);
    const r = await apiFetch<ListResp>("/admin/posts");
    setPosts(r.posts);
    const s = await apiFetch<StatsResp>("/admin/stats");
    setStats(s);
  }

  useEffect(() => {
    load()
      .catch((e: any) => setErr(e?.message || "Error"))
      .finally(() => setLoading(false));
  }, []);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);

    try {
      const form = new FormData();
      form.append("title", title);
      form.append("body", body);
      form.append("isPublic", String(isPublic));
      form.append("price", String(price));
      if (files) {
        Array.from(files).forEach((f) => form.append("files", f));
      }
      const res = await fetch(`${API_URL}/admin/posts`, {
        method: "POST",
        credentials: "include",
        body: form
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`ADMIN_CREATE_FAILED ${res.status}: ${t}`);
      }
      setTitle("");
      setBody("");
      setPrice(0);
      setFiles(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo crear el post");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="text-white/70">Cargando admin...</div>;
  if (err) return <div className="text-red-200">{err}</div>;
  if (!me) return null;

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-white/70">Hola, {me.displayName || "Admin"}. Crea y gestiona posts.</p>
        {stats ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Usuarios</div>
              <div className="text-xl font-semibold">{stats.users}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Posts</div>
              <div className="text-xl font-semibold">{stats.posts}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-white/50">Pagos</div>
              <div className="text-xl font-semibold">{stats.payments}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Crear post</h2>
        <form onSubmit={createPost} className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm text-white/70">Título</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-white/70">Texto</label>
            <textarea
              className="input min-h-[140px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-white/70">Precio (máx $5.000 CLP)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={5000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="isPublic" className="text-sm text-white/70">
              Público (sin paywall)
            </label>
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-white/70">Media (imágenes/videos)</label>
            <input type="file" multiple accept="image/*,video/*" onChange={(e) => handleFileSelect(e.target.files)} />
            <p className="text-xs text-white/50">Máx 10 archivos por post (50MB c/u).</p>
            {fileError ? <p className="text-xs text-red-200">{fileError}</p> : null}
          </div>

          <button disabled={creating} className="btn-primary">
            {creating ? "Creando..." : "Publicar"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Posts recientes</h2>
        <div className="mt-4 grid gap-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-white/50">{new Date(p.createdAt).toLocaleString("es-CL")}</div>
                </div>
                <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-white/70">
                  {p.isPublic ? "Público" : `Premium $${p.price.toLocaleString("es-CL")}`}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/70">{p.body}</p>
              {p.media?.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {p.media.slice(0, 6).map((m) =>
                    m.type === "IMAGE" ? (
                      <img
                        key={m.id}
                        className="w-full rounded-lg border border-white/10"
                        src={m.url.startsWith("http") ? m.url : `${API_URL}${m.url}`}
                        alt="media"
                      />
                    ) : (
                      <video
                        key={m.id}
                        className="w-full rounded-lg border border-white/10"
                        controls
                        src={m.url.startsWith("http") ? m.url : `${API_URL}${m.url}`}
                      />
                    )
                  )}
                </div>
              ) : null}
            </div>
          ))}
          {!posts.length ? <div className="text-white/60">Aún no hay posts.</div> : null}
        </div>
      </div>
    </div>
  );
}
