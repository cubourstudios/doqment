export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-sm rounded-md bg-surface p-6 shadow-card md:p-8">
        {children}
      </div>
    </div>
  );
}
