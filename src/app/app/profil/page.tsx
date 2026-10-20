import { ProfileEditor } from "@/components/profile-editor";
import { PasswordChange } from "@/components/password-change";

export const metadata = { title: "Profil a razítko" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ vitejte?: string }> }) {
  const { vitejte } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl">Profil zpracovatele a razítko</h1>
      {vitejte && (
        <p className="mt-3 max-w-[70ch] border-l-4 border-signal bg-signal-soft px-3 py-2 text-sm">
          Vítejte! Vyplňte údaje zpracovatele – přenesou se do razítka a titulní strany každé analýzy. Pak můžete založit první analýzu.
        </p>
      )}
      <ProfileEditor />
      <section className="mt-12 max-w-md">
        <h2 className="text-xl">Změna hesla</h2>
        <PasswordChange />
      </section>
    </div>
  );
}
