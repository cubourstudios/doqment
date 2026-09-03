import { AppHeader } from "@/components/app/app-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { requireProfile } from "@/lib/auth";

/**
 * The signed-in shell.
 *
 * `pb-20` on the content reserves room for the fixed bottom tab bar, so the
 * last row of a list is never trapped underneath it.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile, email } = await requireProfile();

  return (
    <div className="flex min-h-full flex-1">
      <SidebarNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader name={profile.name} email={email} />

        <main className="flex-1 px-4 pt-4 pb-20 md:px-8 md:pb-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
