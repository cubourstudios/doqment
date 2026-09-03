import Link from "next/link";
import { DoqmentMark } from "@/components/brand/logo";

/**
 * Auth shell. Single column at every width — these forms have four fields at
 * most, and a two-column marketing split would only push the inputs below the
 * fold on a phone.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="safe-top safe-bottom flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold"
        >
          <DoqmentMark className="text-primary size-5 shrink-0" />
          Doqment
        </Link>
        {children}
      </div>
    </main>
  );
}
