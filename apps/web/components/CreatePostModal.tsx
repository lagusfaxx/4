"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import useMe from "../hooks/useMe";
import { API_URL, friendlyErrorMessage } from "../lib/api";

type CreatePostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  defaultMode?: "IMAGE" | "VIDEO";
};

type PreviewItem = { url: string; type: "IMAGE" | "VIDEO" };

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function CreatePostModal({ isOpen, onClose, onCreated, defaultMode = "IMAGE" }: CreatePostModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { me, loading: meLoading } = useMe();

  const [mode, setMode] = useState<"IMAGE" | "VIDEO">(defaultMode);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(defaultMode);
    setTitle("");
    setBody("");
    setIsPublic(false);
    setFiles(null);
    setPreviews([]);
    setError(null);
    setProgress(0);
    setUploading(false);
  }, [isOpen, defaultMode]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const nextToLogin = `/login?next=${encodeURIComponent(pathname || "/inicio")}`;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !fileList.length) {
      setFiles(null);
      setPreviews([]);
      return;
    }
    const allowedVideoMimes = new Set(["video/mp4", "video/quicktime"]);
    const accepted = Array.from(fileList).every((file) => {
      if (file.size > MAX_FILE_SIZE) return false;
      if (mode === "IMAGE") return file.type.startsWith("image/");
      // iOS Safari won't play many "video/*" formats that work on desktop (most commonly WebM).
      // We restrict selection to MP4/MOV to prevent "Reel no disponible" on iPhone.
      return allowedVideoMimes.has((file.type || "").toLowerCase());
    });
    if (!accepted) {
      setError("Formato no compatible en iPhone. Usa MP4 (H.264) o MOV. Máximo 100MB.");
      return;
    }
    setError(null);
    setFiles(fileList);
    const nextPreviews: PreviewItem[] = Array.from(fileList).map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE"
    }));
    setPreviews(nextPreviews);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (meLoading) return;

    if (!me?.user) {
      router.push(nextToLogin);
      return;
    }

    if (!files || !files.length) {
      setError("Debes seleccionar al menos un archivo.");
      return;
    }

    setError(null);
    setUploading(true);

    const form = new FormData();
    form.append("title", title.trim() || (mode === "VIDEO" ? "Nuevo reel" : "Nueva publicación"));
    form.append("body", body.trim() || "Contenido compartido en UZEED.");
    form.append("isPublic", String(isPublic));
    form.append("price", "0");
    Array.from(files).forEach((file) => form.append("files", file));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/posts/mine`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        setUploading(false);
        onCreated?.();
        onClose();
      } else {
        if (xhr.status === 401) {
          setError("Inicia sesión para publicar.");
          setUploading(false);
          return;
        }
        if (xhr.status === 403) {
          setError("Tu cuenta no tiene permisos para publicar.");
          setUploading(false);
          return;
        }
        setError(`No se pudo crear la publicación (${xhr.status}).`);
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      setError("No se pudo subir el contenido.");
      setUploading(false);
    };

    xhr.send(form);
  };

  if (!isOpen) return null;

  const showAuthGate = !meLoading && !me?.user;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-uzeed-950/95 shadow-2xl flex max-h-[85vh] flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Crear {mode === "VIDEO" ? "reel" : "publicación"}</h2>
            <p className="mt-1 text-xs text-white/60">Comparte contenido con tu comunidad.</p>
          </div>
          <button className="btn-ghost shrink-0" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-wrap gap-2">
            {(["IMAGE", "VIDEO"] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={mode === type ? "btn-primary" : "btn-secondary"}
                onClick={() => {
                  setMode(type);
                  handleFiles(null);
                }}
              >
                {type === "IMAGE" ? "Foto" : "Video"}
              </button>
            ))}
          </div>

          {showAuthGate ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-base font-semibold">Inicia sesión para publicar</div>
              <div className="mt-1 text-sm text-white/60">Crea posts, reels y comparte con tu comunidad.</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-primary" type="button" onClick={() => router.push(nextToLogin)}>
                  Iniciar sesión
                </button>
                <button className="btn-secondary" type="button" onClick={onClose}>
                  Más tarde
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm text-white/70">Título</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-white/70">Texto</label>
                <textarea className="input min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="isPublicModal"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="isPublicModal" className="text-sm text-white/70">
                  Público (sin paywall)
                </label>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-white/70">Archivo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mode === "IMAGE" ? "image/*" : "video/mp4,video/quicktime"}
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  className="btn-secondary justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Seleccionar archivo
                </button>
                <p className="text-xs text-white/40">JPG/PNG/MP4 • Máx 100MB • En móvil se verá en pantalla completa.</p>
              </div>

              {previews.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {previews.map((preview) =>
                    preview.type === "IMAGE" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={preview.url}
                        src={preview.url}
                        className="w-full rounded-2xl border border-white/10 object-cover"
                        style={{ maxHeight: 340 }}
                        alt="preview"
                      />
                    ) : (
                      <video
                        key={preview.url}
                        src={preview.url}
                        className="w-full rounded-2xl border border-white/10 object-cover bg-black"
                        style={{ maxHeight: 340 }}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    )
                  )}
                </div>
              ) : null}

              {uploading ? (
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-fuchsia-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              ) : null}

              {error ? <div className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{friendlyErrorMessage({ message: error })}</div> : null}

              {/* spacer so sticky footer doesn't cover content */}
              <div className="h-2" />
            </form>
          )}
        </div>

        {/* Footer (sticky) */}
        {!showAuthGate ? (
          <div className="sticky bottom-0 border-t border-white/10 bg-uzeed-950/95 p-5">
            <button className="btn-primary w-full" disabled={uploading} onClick={(e) => submit(e as any)}>
              {uploading ? `Subiendo ${progress}%` : "Publicar"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
