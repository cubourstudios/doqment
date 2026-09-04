import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/app/(marketing)/legal-page";

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
const SECTIONS: LegalSection[] = [
  {
    id: "what-doqment-is",
    title: "What Doqment is",
    body: (
      <p>
        Doqment helps freelancers work out which documents a project needs and
        generates those documents from templates. You keep ownership of
        everything you create with it.
      </p>
    ),
  },
  {
    id: "what-doqment-is-not",
    title: "What Doqment is not",
    body: (
      <>
        <p>
          <strong className="text-foreground font-semibold">
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
      </>
    ),
  },
  {
    id: "your-account",
    title: "Your account",
    body: (
      <>
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
      </>
    ),
  },
  {
    id: "payment",
    title: "Payment",
    body: (
      <>
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
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability",
    body: (
      <p>
        We try to keep Doqment running and your data safe, but we cannot promise
        uninterrupted service. Export your important documents rather than
        relying on us as your only copy — there is a one-click export in
        settings for exactly this reason.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <p>
        To the extent the law allows, Doqment is provided as is, and our
        liability to you is limited to what you have paid us in the twelve
        months before the claim. Nothing here limits liability that cannot
        legally be limited.
      </p>
    ),
  },
  {
    id: "ending-your-account",
    title: "Ending your account",
    body: (
      <p>
        You can delete your account at any time from settings, which removes
        your data permanently. We may suspend an account that breaks these
        terms, and will tell you why where we can.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes",
    body: (
      <p>
        If we change these terms materially we will say so in the app before the
        change takes effect, rather than quietly updating this page.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: <p>Questions about these terms: get in touch through the app.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="3 September 2026"
      sections={SECTIONS}
    />
  );
}
