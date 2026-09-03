import { Heading } from "@/components/ui/heading";

// Placeholder only — Supabase Auth wiring happens in the backend integration
// phase (CLAUDE.md §7, D7).
export default function SignupPage() {
  return (
    <div className="flex flex-col gap-2">
      <Heading as="h1" size="card">
        Sign up
      </Heading>
      <p className="text-sm text-heading/60">Placeholder — auth wiring lands in a later phase.</p>
    </div>
  );
}
