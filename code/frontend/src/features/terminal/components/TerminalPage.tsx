import { Card, CardContent } from '@/shared/components/ui/card';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';

export default function TerminalPage() {
  return (
    <PageShell>
      <PageHeader title="Terminal" />

      <PageContent>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">🖥️ Terminal</h3>
              <p className="text-muted-foreground">
                Terminal integration coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageShell>
  );
}
