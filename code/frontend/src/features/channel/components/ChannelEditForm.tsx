import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Plus, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageShell } from '@/shared/components/layout/PageShell';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { PageContent } from '@/shared/components/layout/PageContent';
import { useCreateChannel, useUpdateChannel } from '@/lib/trpc/hooks/channel.hooks';
import type { Channel } from '@/lib/trpc-types';

interface ChannelEditFormProps {
  channel?: Channel;
  onSaved: () => void;
}

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export function ChannelEditForm({ channel, onSaved }: ChannelEditFormProps) {
  const { t } = useTranslation('channel');
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();

  const isCreateMode = !channel;

  const [name, setName] = useState(channel?.name ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [isPrivate, setIsPrivate] = useState(channel?.is_private ?? false);
  const [tags, setTags] = useState<string[]>(channel?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (isCreateMode) {
      createChannel.mutate(
        { name, description, is_private: isPrivate, tags },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(onSaved, 600);
          },
        },
      );
    } else {
      updateChannel.mutate(
        {
          channelId: channel.channel_id,
          data: { name, description, is_private: isPrivate, tags },
        },
        {
          onSuccess: () => {
            setSaved(true);
            setTimeout(onSaved, 600);
          },
        },
      );
    }
  }

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  return (
    <PageShell>
      <PageHeader
        title={channel?.name ?? t('editForm.newChannel')}
        subtitle={t('editForm.subtitle')}
        actions={
          <Button onClick={handleSave} disabled={createChannel.isPending || updateChannel.isPending || saved}>
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? t('common:actions.saved') : t('common:actions.save')}
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{t('editForm.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('editForm.name')}</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('editForm.namePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('editForm.description')}</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder={t('editForm.descriptionPlaceholder')}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={e => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  {t('editForm.private')}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('editForm.privateDescription')}
                </p>
              </div>

              <div>
                <Label>{t('editForm.tags')}</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-foreground transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder={t('editForm.tagPlaceholder')}
                  />
                  <Plus size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageShell>
  );
}
