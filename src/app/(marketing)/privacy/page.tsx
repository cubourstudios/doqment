import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/app/(marketing)/legal-page";

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
const SECTIONS: LegalSection[] = [
  {
    id: "what-we-store",
    title: "What we store",
    body: (
      <>
        <p>Only what the product needs to work:</p>
        <ul className="grid list-disc gap-2 pl-5">
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
      </>
    ),
  },
  {
    id: "what-we-do-not-store",
    title: "What we do not store",
    body: (
      <>
        <p>
          <strong className="text-foreground font-semibold">
            Card details never touch our servers.
          </strong>{" "}
          Payments go directly to Razorpay, who handles the card and tells us
          only whether a subscription is active.
        </p>
        <p>
          We do not sell your data, and we do not use the contents of your
          documents to train anything.
        </p>
      </>
    ),
  },
  {
    id: "who-can-see-it",
    title: "Who can see it",
    body: (
      <>
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
      </>
    ),
  },
  {
    id: "who-we-share-it-with",
    title: "Who we share it with",
    body: (
      <p>
        Only the services needed to run Doqment: Supabase (database,
        authentication and file storage), Vercel (hosting), and Razorpay
        (payments). Each sees only what its job requires.
      </p>
    ),
  },
  {
    id: "export-and-deletion",
    title: "Getting it back, or getting rid of it",
    body: (
      <>
        <p>
          Settings has a one-click export that gives you everything as JSON,
          including full document contents — not a summary.
        </p>
        <p>
          Deleting your account removes your data permanently and is not
          recoverable, including uploaded files. If you want a copy, export
          first.
        </p>
      </>
    ),
  },
  {
    id: "how-long-we-keep-it",
    title: "How long we keep it",
    body: (
      <p>
        For as long as your account exists. Delete the account and it goes; we
        do not keep a shadow copy.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        A session cookie to keep you logged in. No advertising cookies and no
        third-party trackers.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about your data, or a request to access or delete it: get in
        touch through the app.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="3 September 2026"
      sections={SECTIONS}
    />
  );
}
