import Link from "next/link";
import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="bg-navy-deep py-16 text-white md:py-24">
      <Container className="flex flex-col items-center gap-6 text-center">
        <Heading invert align="center" className="max-w-xl">
          Find out what your next project actually needs.
        </Heading>
        <Link
          href="/onboarding"
          className={buttonVariants({ variant: "inverted", size: "lg", className: "w-full sm:w-auto" })}
        >
          Check my project, free, takes about 30 seconds
        </Link>
      </Container>
    </section>
  );
}
