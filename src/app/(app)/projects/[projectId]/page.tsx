import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";

// Checklist view placeholder (Flow C) — built in step D4 against mock data.
export default function ProjectChecklistPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <Container className="py-8">
      <Heading as="h1" size="card">
        Project {params.projectId}
      </Heading>
      <p className="mt-2 text-sm text-heading/60">Placeholder — checklist view built in step D4.</p>
    </Container>
  );
}
