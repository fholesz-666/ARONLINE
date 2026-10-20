import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-sheet">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <Brand />
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
