import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FileTextIcon,
  ReceiptIndianRupeeIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const VALUE_PROPS = [
  {
    icon: CheckCircle2Icon,
    title: "Know what you need",
    body: "Describe the project. Get a checklist of the documents it actually needs — each with one line on why it matters, and what goes wrong without it.",
  },
  {
    icon: FileTextIcon,
    title: "Generate them in minutes",
    body: "Proposals, service agreements, SOWs and NDAs from guided forms that fill themselves in from details you've already given.",
  },
  {
    icon: ReceiptIndianRupeeIcon,
    title: "Invoices that hold up",
    body: "GST-compliant tax invoices for India, standard invoices elsewhere. Numbered sequentially, with no gaps and no duplicates.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Everything in one place",
    body: "Documents stay filed under the project, searchable by client, downloadable whenever your accountant asks.",
  },
];

export default function LandingPage() {
  return (
    <>
      <header className="safe-top flex h-14 items-center justify-between px-4 md:px-8">
        <span className="flex items-center gap-2 font-semibold">
          <FileTextIcon className="size-5" />
          Doqment
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <main className="safe-bottom flex-1 px-4 pb-12 md:px-8">
        <section className="mx-auto max-w-2xl pt-10 text-center md:pt-20">
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
            Know which documents you need. Then create them.
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base text-pretty md:text-lg">
            Doqment tells freelancers which contracts and invoices a project
            calls for — and why — then generates them. Built for people who have
            been burned by a handshake deal.
          </p>

          {/* Full-width on mobile: the primary action should be a thumb-sized
              target at the bottom of the fold, not a small centred pill. */}
          <div className="mt-8 grid gap-3 sm:flex sm:justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/signup">
                Get started free
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            Free to start. No card needed.
          </p>
        </section>

        <section className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border p-5">
              <Icon className="size-5" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{body}</p>
            </div>
          ))}
        </section>

        <p className="text-muted-foreground mx-auto mt-12 max-w-2xl text-center text-xs">
          Doqment generates documents from templates. It is not a law firm and
          does not provide legal advice — for anything high-stakes, have a
          lawyer review the result.
        </p>
      </main>

      <footer className="safe-bottom text-muted-foreground flex flex-wrap items-center justify-center gap-4 border-t px-4 py-6 text-sm">
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
      </footer>
    </>
  );
}
