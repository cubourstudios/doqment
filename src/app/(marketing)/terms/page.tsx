import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms you agree to when using Doqment.",
};

/**
 * Terms of service.
 *
 * Written in plain language and kept short on purpose. Terms nobody can read
 * are terms nobody has agreed to in any meaningful sense, and the most
 * important clause here — that we are not a law firm — is one the user really
 * does need to understand rather than merely click past.
 *
 * This is a starting point drafted from common practice, not a lawyer's work.
 * Have it reviewed before taking real payments.
 */
export default function TermsPage() {
  return (
    <article className="prose-doqment mx-auto w-full max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Doqment
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Last updated 3 September 2026
      </p>

      <Section title="What Doqment is">
        <p>
          Doqment helps freelancers work out which documents a project needs and
          generates those documents from templates. You keep ownership of
          everything you create with it.
        </p>
      </Section>

      <Section title="What Doqment is not">
        <p>
          <strong>
            Doqment is not a law firm and does not provide legal advice.
          </strong>{" "}
          The templates are drafted from common practice, not tailored to your
          situation, and no lawyer has reviewed your use of them. For anything
          high-stakes — a large engagement, an unusual client, anything you
          would be badly hurt by getting wrong — have a qualified lawyer in your
          jurisdiction review the document before you rely on it.
        </p>
        <p>
          The same applies to tax. Doqment calculates GST and other taxes from
          the details you enter and the rate you select. Those calculations are
          only as correct as what you tell it, and they do not replace an
          accountant.
        </p>
      </Section>

      <Section title="Your account">
        <p>
          You are responsible for keeping your login details secure and for
          everything done through your account. Tell us promptly if you think
          someone else has access to it.
        </p>
        <p>
          You must not use Doqment to create documents intended to deceive
          anyone, to impersonate a real business you do not represent, or for
          anything unlawful.
        </p>
      </Section>

      <Section title="Payment">
        <p>
          The free plan is free and stays free. Pro is billed monthly in advance
          and renews automatically until you cancel. Cancelling takes effect at
          the end of the period you have already paid for — you keep Pro until
          then, and we do not refund partial months.
        </p>
        <p>
          Cancelling never deletes your data. You drop to the free plan and keep
          access to everything you have created.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          We try to keep Doqment running and your data safe, but we cannot
          promise uninterrupted service. Export your important documents rather
          than relying on us as your only copy — there is a one-click export in
          settings for exactly this reason.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the extent the law allows, Doqment is provided as is, and our
          liability to you is limited to what you have paid us in the twelve
          months before the claim. Nothing here limits liability that cannot
          legally be limited.
        </p>
      </Section>

      <Section title="Ending your account">
        <p>
          You can delete your account at any time from settings, which removes
          your data permanently. We may suspend an account that breaks these
          terms, and will tell you why where we can.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If we change these terms materially we will say so in the app before
          the change takes effect, rather than quietly updating this page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms: get in touch through the app.
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
