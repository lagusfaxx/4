import Link from "next/link";

export default function BillingReturnPage() {
  return (
    <div className="max-w-xl mx-auto card p-8">
      <h1 className="text-2xl font-semibold">Pago recibido</h1>
      <p className="mt-2 text-white/60">
        Si Khipu ya confirmó el pago por webhook, tu membresía quedará activa automáticamente. Si no ves el estado
        actualizado, espera unos segundos y recarga.
      </p>
      <div className="mt-6 flex gap-3 flex-wrap">
        <Link className="btn-primary" href="/dashboard">
          Ir a mi cuenta
        </Link>
        <Link className="btn-secondary" href="/feed">
          Ir al feed
        </Link>
      </div>
    </div>
  );
}
