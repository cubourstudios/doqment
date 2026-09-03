import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { StickyCta } from "@/components/marketing/sticky-cta";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      {/* pb-20 reserves room for the mobile sticky CTA bar so it never covers content */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <StickyCta />
    </div>
  );
}
