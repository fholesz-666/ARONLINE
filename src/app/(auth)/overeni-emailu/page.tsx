import Link from "next/link";
import { Notice } from "@/components/ui";
import { verifyEmail } from "@/server/services/auth";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token && token.length >= 10 && token.length < 200 ? await verifyEmail(token) : false;
  return (
    <div className="panel space-y-4 p-6">
      <h1 className="text-2xl">Ověření e-mailu</h1>
      {ok ? (
        <Notice tone="ok">E-mail je ověřený. Můžete nakupovat analýzy a předplatné.</Notice>
      ) : (
        <Notice tone="error">Odkaz je neplatný nebo už byl použit. Nový odkaz si pošlete v aplikaci v sekci Profil.</Notice>
      )}
      <Link href="/app" className="btn btn-primary w-full">
        Pokračovat do aplikace
      </Link>
    </div>
  );
}
