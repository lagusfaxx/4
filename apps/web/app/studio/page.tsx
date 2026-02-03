"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_URL } from "../../lib/api";

type MeResponse = {
  user: { id: string; role: "USER" | "ADMIN"; displayName: string | null; profileType: string } | null;
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

type Preview = { url: string; type: "IMAGE" | "VIDEO" };

export default function StudioPage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [creating, setCreating] = useState(false);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editPublic, setEditPublic] = useState(false);

  async function load() {
    const m = await apiFetch<MeResponse>("/auth/me");
    if (!m.user) {
      window.location.href = "/login";
      return;
    }
    setMe(m.user);
    const r = await apiFetch<ListResp>("/posts/mine");
    setPosts(r.posts);
  }

  useEffect(() => {
    load()
      .catch((e: any) => setErr(e?.message || "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);

    try {
      const form = new FormData();
      form.append("title", title);
      form.append("body", body);
      form.append("isPublic", String(isPublic));
      form.append("price", "0");
      if (files) {
        Array.from(files).forEach((f) => form.append("files", f));
      }
      const res = await fetch(`${API_URL}/posts/mine`, {
        method: "POST",
        credentials: "include",
        body: form
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`CREATE_FAILED ${res.status}: ${t}`);
      }
      setTitle("");
      setBody("");
      setFiles(null);
      setPreviews([]);
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo crear el post");
    } finally {
      setCreating(false);
    }
  }

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) {
      setFiles(null);
      setPreviews([]);
      return;
    }
    const valid = Array.from(fileList).every((file) => {
      const okType = file.type.startsWith("image/") || file.type.startsWith("video/");
      const okSize = file.size <= 100 * 1024 * 1024;
      return okType && okSize;
    });
    if (!valid) {
      setErr("Solo se permiten imágenes o videos (máximo 100MB).");
      return;
    }
    setFiles(fileList);
    const nextPreviews: Preview[] = Array.from(fileList).map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE"
    }));
    setPreviews(nextPreviews);
  };

  const startEdit = (post: Post) => {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditPublic(post.isPublic);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
    setEditPublic(false);
  };

  const saveEdit = async (postId: string) => {
    try {
      await apiFetch(`/posts/mine/${postId}`, {
        method: "PUT",
        body: JSON.stringify({ title: editTitle, body: editBody, isPublic: editPublic })
      });
      await load();
      cancelEdit();
    } catch (e: any) {
      setErr(e?.message || "No se pudo actualizar el post");
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await apiFetch(`/posts/mine/${postId}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "No se pudo eliminar el post");
    }
  };

  if (loading) return <div className="text-white/70">Cargando publicaciones...</div>;
  if (err) return <div className="text-red-200">{err}</div>;
  if (!me) return null;

  const hasPosts = posts.length > 0;

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Publicaciones</h1>
        <p className="mt-1 text-sm text-white/70">Hola, {me.displayName || "Creador"}.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Crear publicación</h2>
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
            <p className="text-xs text-white/40">Formatos permitidos: JPG, PNG, MP4. Máximo 100MB.</p>
          </div>
          {previews.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {previews.map((preview) =>
                preview.type === "IMAGE" ? (
                  <img key={preview.url} src={preview.url} className="w-full rounded-xl border border-white/10" alt="preview" />
                ) : (
                  <video key={preview.url} src={preview.url} className="w-full rounded-xl border border-white/10" controls />
                )
              )}
            </div>
          ) : null}

          <button disabled={creating} className="btn-primary">
            {creating ? "Creando..." : "Publicar"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold">Publicaciones</h2>
        <div className="mt-4 grid gap-4">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-xs text-white/50">{new Date(p.createdAt).toLocaleString("es-CL")}</div>
                </div>
                <span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-white/70">
                  {p.isPublic ? "Gratis" : "Solo miembros"}
                </span>
              </div>
              {editingId === p.id ? (
                <div className="mt-3 grid gap-3">
                  <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <textarea className="input min-h-[120px]" value={editBody} onChange={(e) => setEditBody(e.target.value)} />
                  <label className="flex items-center gap-2 text-xs text-white/60">
                    <input
                      type="checkbox"
                      checked={editPublic}
                      onChange={(e) => setEditPublic(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Público (sin paywall)
                  </label>
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => saveEdit(p.id)} type="button">
                      Guardar cambios
                    </button>
                    <button className="btn-secondary" onClick={cancelEdit} type="button">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-sm text-white/70">{p.body}</p>
                  <div className="mt-4 flex gap-2">
                    <button className="btn-secondary" onClick={() => startEdit(p)} type="button">
                      Editar
                    </button>
                    <button className="btn-secondary" onClick={() => deletePost(p.id)} type="button">
                      Eliminar
                    </button>
                  </div>
                </>
              )}
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
          {!hasPosts ? <div className="text-white/60">Aún no hay posts.</div> : null}
        </div>
      </div>
    </div>
  );
}
