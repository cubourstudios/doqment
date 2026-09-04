import type { DocType } from "@/lib/guidance/types";

/**
 * Disclaimer text and the rule for when it applies.
 *
 * Deliberately free of database imports. The disclaimer is shown in client
 * components, and a client component importing a module that reaches for
 * `db` pulls the postgres driver into the browser bundle — which fails the
 * build with "Can't resolve 'fs'", an error that says nothing about the real
 * cause. The logging half lives in ./disclaimer-log.ts for that reason.
 *
 * On the substance: this product generates contracts from templates. It is not
 * a law firm and the templates are not legal advice, and that has to be said
 * plainly rather than buried in terms nobody reads — a freelancer relying on an
 * unreviewed service agreement for a large engagement is exactly the person who
 * gets hurt if we imply more than we can stand behind.
 */

/** Contracts carry real legal weight; an invoice is arithmetic. */
const NEEDS_DISCLAIMER: DocType[] = [
  "proposal",
  "service_agreement",
  "sow",
  "nda",
];

export function requiresDisclaimer(docType: DocType): boolean {
  return NEEDS_DISCLAIMER.includes(docType);
}

export const DISCLAIMER_TEXT =
  "Doqment generates documents from templates and is not a law firm. " +
  "This is not legal advice. For anything high-stakes, have a lawyer review " +
  "the result before you rely on it.";
