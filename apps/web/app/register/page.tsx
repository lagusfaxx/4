import AuthForm from "../../components/AuthForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto card p-8 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400/60 via-sky-400/60 to-transparent" />
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-2 text-sm text-white/60">
        Escoge tu tipo de perfil: persona, creador, profesional o tienda/motel/sexshop.
      </p>

      <div className="mt-6">
        <AuthForm mode="register" />
      </div>

      <div className="mt-6 text-sm text-white/60">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-white underline">
          Ingresar
        </Link>
      </div>
    </div>
  );
}
