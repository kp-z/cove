import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  return (
    <PageShell>
      <PageHeader title="Dashboard" subtitle={t('subtitle')} />

      <PageContent>
        <div className="max-w-7xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20 mb-6">
            <CardContent className="p-8">
              <h1 className="text-3xl font-bold mb-2">Welcome to Cove</h1>
              <p className="text-muted-foreground text-lg">
                {t('welcome.description')}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:border-blue-500/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="font-semibold mb-2">Start Chat</h3>
                <p className="text-sm text-muted-foreground">{t('cards.startChat')}</p>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🤖</span>
                </div>
                <h3 className="font-semibold mb-2">Manage Agents</h3>
                <p className="text-sm text-muted-foreground">{t('cards.manageAgents')}</p>
              </CardContent>
            </Card>

            <Card className="hover:border-blue-500/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="font-semibold mb-2">Create Workflow</h3>
                <p className="text-sm text-muted-foreground">{t('cards.createWorkflow')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </PageShell>
  );
}
