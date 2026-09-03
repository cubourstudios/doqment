import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";

// Placeholder for the free checklist flow ("Check what my project needs,
// free") referenced from the marketing hero/final CTA. Real guidance logic
// (src/lib/guidance/evaluate-checklist.ts) lands in Build Sequence step D4.
export default function OnboardingPage() {
  return (
    <Container className="flex min-h-screen flex-col items-center justify-center gap-2 py-16 text-center">
      <Heading as="h1" size="card">
        Check what my project needs
      </Heading>
      <p className="max-w-md text-sm text-heading/60">
        Placeholder — the guided checklist flow (Flow C) is built in step D4 of
        the build sequence.
      </p>
    </Container>
  );
}
