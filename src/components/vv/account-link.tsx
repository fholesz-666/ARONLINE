import Link from "next/link";
import { getCurrent } from "@/server/auth/session";

/** Odkaz v hlavičce VV: přihlášený uživatel → Moje protokoly, jinak Přihlásit (jen server). */
export async function VvAccountLink() {
  let loggedIn = false;
  try {
    const c = await getCurrent();
    loggedIn = !!c && !c.user.isGuest;
  } catch {
    loggedIn = false;
  }
  return loggedIn ? (
    <Link href="/vnejsi-vlivy/moje" className="vv-btn vv-btn-ghost hidden sm:inline-flex">
      Moje protokoly
    </Link>
  ) : (
    <Link href="/prihlaseni?next=/vnejsi-vlivy/moje" className="vv-btn vv-btn-ghost hidden sm:inline-flex">
      Přihlásit
    </Link>
  );
}
