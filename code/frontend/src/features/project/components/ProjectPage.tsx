import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';

export default function ProjectPage() {
  const { t } = useTranslation('dashboard');
  return (
    <PageShell>
      <PageHeader title={t('projectPage.title')} />

      <PageContent>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">{'📁 ' + t('projectPage.heading')}</h3>
              <p className="text-muted-foreground">
                {t('projectPage.description')}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageShell>
  );
}
