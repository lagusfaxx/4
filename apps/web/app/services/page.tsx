"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, isAuthError, resolveMediaUrl } from "../../lib/api";

type Service = {
  id: string;
  status: "PENDIENTE_APROBACION" | "ACTIVO" | "PENDIENTE_EVALUACION" | "FINALIZADO";
  createdAt: string;
  professional: {
    id: string;
    name: string;
    avatarUrl: string | null;
    category: string | null;
    isActive: boolean;
  };
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname() || "/servicios";

  useEffect(() => {
    apiFetch<{ services: Service[] }>("/services/active")
      .then((res) => setServices(res.services))
      .catch((err: any) => {
        if (isAuthError(err)) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setError(err?.message || "No se pudo cargar servicios");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  if (loading) return <div className="text-white/60">Cargando servicios...</div>;
  if (error) return <div className="card p-6 text-red-200 border-red-500/30 bg-red-500/10">{error}</div>;

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Servicios activos</h1>
        <p className="mt-2 text-sm text-white/70">Seguimiento de solicitudes y servicios en curso.</p>
      </div>

      <div className="grid gap-4">
        {services.map((service) => (
          <div key={service.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/10">
                  {service.professional.avatarUrl ? (
                    <img
                      src={resolveMediaUrl(service.professional.avatarUrl) || ""}
                      alt={service.professional.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <div className="font-semibold">{service.professional.name}</div>
                  <div className="text-xs text-white/60">{service.professional.category || "Profesional"}</div>
                  <div className="mt-1 text-xs text-white/50">Estado: {service.status}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/profesional/${service.professional.id}`} className="btn-secondary">
                  Ver perfil
                </Link>
                <Link href={`/chat/${service.professional.id}`} className="btn-secondary">
                  Enviar mensaje
                </Link>
                {service.status === "PENDIENTE_EVALUACION" ? (
                  <Link href={`/calificar/profesional/${service.id}`} className="btn-primary">
                    Calificar
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {!services.length ? <div className="card p-6 text-white/60">No tienes servicios activos.</div> : null}
      </div>
    </div>
  );
}
