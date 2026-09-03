// Authenticated shell placeholder — bottom tab bar / sheet on mobile,
// persistent sidebar on desktop, per CLAUDE.md §2.3. Built out in step D3.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-surface-muted">{children}</div>;
}
