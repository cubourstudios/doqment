import { Heading } from "@/components/ui/heading";
import { Container } from "@/components/ui/container";

// Guided form + PDF preview placeholder — tabbed Edit/Preview on mobile,
// side-by-side split pane on desktop (CLAUDE.md §2.3). Built in step D4.
export default function DocumentFormPage({
  params,
}: {
  params: { projectId: string; docType: string };
}) {
  return (
    <Container className="py-8">
      <Heading as="h1" size="card">
        {params.docType} — project {params.projectId}
      </Heading>
      <p className="mt-2 text-sm text-heading/60">Placeholder — guided form + preview built in step D4.</p>
    </Container>
  );
}
