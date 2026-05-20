import { useTranslation } from 'react-i18next';
import { GlassCard } from '@/shared/components/ui/cards/GlassCard';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';

export default function OKRPage() {
  const { t } = useTranslation('dashboard');
  return (
    <PageShell>
      <PageHeader title={t('okrPage.title')} />

      <PageContent>
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold mb-4">{'🎯 ' + t('okrPage.heading')}</h3>
            <p className="text-muted-foreground">
              {t('okrPage.description')}
            </p>
          </GlassCard>
        </div>
      </PageContent>
    </PageShell>
  );
}
