import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { FolderPlusIcon } from "lucide-react";

import { db } from "@/db";
import { documents, projects } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Home" };

export default async function DashboardPage() {
  const { userId, profile } = await requireProfile();

  // Both queries filter on userId explicitly: this connection bypasses RLS.
  const [recentProjects, recentDocuments] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt))
      .limit(5),
    db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), isNull(documents.deletedAt)))
      .orderBy(desc(documents.createdAt))
      .limit(5),
  ]);

  const firstName = profile.name?.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        {firstName ? `Hello, ${firstName}` : "Hello"}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Start with a project. Doqment works out which documents it needs.
      </p>

      {recentProjects.length === 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Create your first project</CardTitle>
            <CardDescription>
              Tell us the client, the kind of work and roughly what it&apos;s
              worth. You&apos;ll get a checklist of the documents that project
              needs — and why each one matters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/projects/new">
                <FolderPlusIcon />
                New project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Projects</h2>
              <Button asChild size="sm" variant="outline">
                <Link href="/projects/new">New project</Link>
              </Button>
            </div>
            <ul className="grid gap-2">
              {recentProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="hover:bg-accent flex min-h-14 items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                  >
                    <span className="truncate font-medium">{project.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {recentDocuments.length > 0 ? (
            <section>
              <h2 className="mb-3 font-semibold">Recent documents</h2>
              <ul className="grid gap-2">
                {recentDocuments.map((document) => (
                  <li key={document.id}>
                    <Link
                      href={`/documents/${document.id}`}
                      className="hover:bg-accent flex min-h-14 items-center justify-between rounded-lg border px-4 py-3 transition-colors"
                    >
                      <span className="truncate font-medium">
                        {document.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
