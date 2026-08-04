import { AppShell } from "@/components/app-shell";
import { WorkspaceSettingsForm } from "@/components/workspace-settings-form";
import { readStoredWorkspaceSetting } from "@/lib/workspace-files";

export default async function WorkspaceSettingsPage() {
  const setting = await readStoredWorkspaceSetting();

  return (
    <AppShell>
      <WorkspaceSettingsForm initialSetting={setting} />
    </AppShell>
  );
}
