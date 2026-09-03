import Link from "next/link";
import { Container } from "@/components/ui/container";

const columns = [
  {
    label: "Product",
    links: [
      { label: "Check my project", href: "/onboarding" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    label: "Company",
    links: [
      { label: "Contact Sales", href: "/contact-sales" },
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
];

// Multi-column footer per docs/design-system.md §9.
export function Footer() {
  return (
    <footer className="border-t border-heading/10 bg-surface py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-2">
            <p className="font-body text-lg font-semibold text-heading">Doqment</p>
            <p className="mt-2 max-w-xs text-sm text-heading/60">
              Know what your project needs, before it costs you.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-heading/40">
                {col.label}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-primary hover:text-primary-hover">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-heading/40">
          © {new Date().getFullYear()} Doqment. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
