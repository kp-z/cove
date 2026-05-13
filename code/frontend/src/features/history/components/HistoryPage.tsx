import { Card, CardContent } from '@/shared/components/ui/card';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';

export default function HistoryPage() {
  return (
    <PageShell>
      <PageHeader title="History" />

      <PageContent>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">📜 Execution History</h3>
              <p className="text-muted-foreground">
                Workflow execution history coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageShell>
  );
}
