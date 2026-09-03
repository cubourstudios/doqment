import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";

export default function DashboardPage() {
  return (
    <Container className="py-8">
      <Heading as="h1" size="card">
        Dashboard
      </Heading>
      <p className="mt-2 text-sm text-heading/60">Placeholder — built in step D4 against mock data.</p>
    </Container>
  );
}
