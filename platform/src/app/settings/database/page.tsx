import { AppShell } from "@/components/app-shell";
import { DatabaseSettingsForm } from "@/components/database-settings-form";

export default function DatabaseSettingsPage() {
  return (
    <AppShell>
      <DatabaseSettingsForm />
    </AppShell>
  );
}
