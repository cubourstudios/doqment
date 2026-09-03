import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Doqment stores, why, and how to get rid of it.",
};

/**
 * Privacy policy.
 *
 * Specific about what is actually stored rather than reserving every right a
 * lawyer could think of. A freelancer is trusting this product with their
 * clients' names and their own income; vagueness here is not neutral.
 *
 * Drafted from common practice, not by a lawyer. Have it reviewed before
 * launch, particularly if you take EU or UK users.
 */
export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Doqment
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Last updated 3 September 2026
      </p>

      <Section title="What we store">
        <p>Only what the product needs to work:</p>
        <ul className="grid list-disc gap-1 pl-5">
          <li>Your email address and name, to identify your account.</li>
          <li>
            Your business details — business name, country, tax registration
            number, logo — because they appear on the documents you generate.
          </li>
          <li>
            Your clients&apos; names, addresses and tax numbers, for the same
            reason.
          </li>
          <li>
            The projects, documents and invoices you create, including their
            full contents.
          </li>
          <li>Files you upload, in private storage.</li>
        </ul>
      </Section>

      <Section title="What we do not store">
        <p>
          <strong>Card details never touch our servers.</strong> Payments go
          directly to Razorpay, who handles the card and tells us only
          whether a subscription is active.
        </p>
        <p>
          We do not sell your data, and we do not use the contents of your
          documents to train anything.
        </p>
      </Section>

      <Section title="Who can see it">
        <p>
          Your data is isolated at the database level, not just in application
          code: every table carries a row-level security policy that ties each
          row to its owner. Another user cannot read your rows even if the
          application has a bug.
        </p>
        <p>
          Uploaded files sit in private storage and are reachable only through
          links that expire after an hour.
        </p>
      </Section>

      <Section title="Who we share it with">
        <p>
          Only the services needed to run Doqment: Supabase (database,
          authentication and file storage), Vercel (hosting), and Razorpay or
          Razorpay for payments. Each sees only what its job requires.
        </p>
      </Section>

      <Section title="Getting it back, or getting rid of it">
        <p>
          Settings has a one-click export that gives you everything as JSON,
          including full document contents — not a summary.
        </p>
        <p>
          Deleting your account removes your data permanently and is not
          recoverable, including uploaded files. If you want a copy, export
          first.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          For as long as your account exists. Delete the account and it goes;
          we do not keep a shadow copy.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          A session cookie to keep you logged in. No advertising cookies and no
          third-party trackers.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about your data, or a request to access or delete it: get in
          touch through the app.
        </p>
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-muted-foreground mt-2 grid gap-3 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
