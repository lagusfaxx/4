"use client";

import AuthForm from "../../components/AuthForm";
import Link from "next/link";

export default function RegisterClient() {
  return (
    <div className="max-w-md mx-auto card p-8 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-400/60 via-purple-400/60 to-transparent" />
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-2 text-sm text-white/60">Completa tus datos para comenzar.</p>

      <div className="mt-6">
        <AuthForm mode="register" />
      </div>

      <div className="mt-4 text-sm text-white/60">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-white underline">
          Inicia sesión
        </Link>
      </div>
    </div>
  );
}
