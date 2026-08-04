import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { RunDetailView } from "@/components/run-detail-view";
import { getCodexRun } from "@/lib/run-history";

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = await getCodexRun(runId);

  if (!run) {
    notFound();
  }

  return (
    <AppShell>
      <RunDetailView run={run} />
    </AppShell>
  );
}
