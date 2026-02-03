"use client";

import useMe from "../../hooks/useMe";

export default function AccountPage() {
  const { me } = useMe();

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold">Cuenta</h1>
        <p className="mt-2 text-sm text-white/70">Gestiona tu perfil y preferencias.</p>
      </div>
      <div className="card p-6">
        <div className="text-sm text-white/60">Usuario</div>
        <div className="mt-2 text-lg font-semibold">
          {me?.user?.displayName || me?.user?.username || "Invitado"}
        </div>
        <div className="text-xs text-white/50">{me?.user?.email || "Inicia sesión para ver más"}</div>
      </div>
    </div>
  );
}
