import { MessageSquare } from 'lucide-react';
import { SectionCard } from '@/shared/components/layout/SectionCard';
import { FormField } from '@/shared/components/form/FormField';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';

interface CommunicationRules {
  allowMentions: boolean;
  allowThreads: boolean;
  allowAttachments: boolean;
  maxMessageLength: number;
  maxMembers?: number;
  rateLimit?: {
    messagesPerMinute: number;
    enabled: boolean;
  };
}

interface ChannelCommunicationRulesSectionProps {
  rules: CommunicationRules;
  onRulesChange: (rules: CommunicationRules) => void;
}

export function ChannelCommunicationRulesSection({
  rules,
  onRulesChange,
}: ChannelCommunicationRulesSectionProps) {
  const updateRule = <K extends keyof CommunicationRules>(
    key: K,
    value: CommunicationRules[K]
  ) => {
    onRulesChange({ ...rules, [key]: value });
  };

  const updateRateLimit = (field: 'messagesPerMinute' | 'enabled', value: number | boolean) => {
    onRulesChange({
      ...rules,
      rateLimit: {
        messagesPerMinute: rules.rateLimit?.messagesPerMinute ?? 60,
        enabled: rules.rateLimit?.enabled ?? false,
        [field]: value,
      },
    });
  };

  return (
    <SectionCard
      title="Communication Rules"
      description="Channel communication settings"
      icon={<MessageSquare className="w-4 h-4" />}
    >
      <div className="space-y-4">
        {/* Row 1: Switches */}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Mentions" description="Allow @mentions">
            <div className="flex items-center h-9">
              <Switch
                checked={rules.allowMentions}
                onCheckedChange={(checked) => updateRule('allowMentions', checked)}
              />
            </div>
          </FormField>

          <FormField label="Threads" description="Allow threads">
            <div className="flex items-center h-9">
              <Switch
                checked={rules.allowThreads}
                onCheckedChange={(checked) => updateRule('allowThreads', checked)}
              />
            </div>
          </FormField>

          <FormField label="Attachments" description="Allow files">
            <div className="flex items-center h-9">
              <Switch
                checked={rules.allowAttachments}
                onCheckedChange={(checked) => updateRule('allowAttachments', checked)}
              />
            </div>
          </FormField>
        </div>

        {/* Row 2: Limits */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Max Message Length" description="Characters">
            <Input
              type="number"
              value={rules.maxMessageLength}
              onChange={(e) => updateRule('maxMessageLength', parseInt(e.target.value) || 0)}
              min={1}
            />
          </FormField>

          <FormField label="Max Members" description="Optional limit">
            <Input
              type="number"
              value={rules.maxMembers || ''}
              onChange={(e) => updateRule('maxMembers', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Unlimited"
              min={1}
            />
          </FormField>
        </div>

        {/* Row 3: Rate Limit */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Rate Limit" description="Enable rate limiting">
            <div className="flex items-center h-9">
              <Switch
                checked={rules.rateLimit?.enabled ?? false}
                onCheckedChange={(checked) => updateRateLimit('enabled', checked)}
              />
            </div>
          </FormField>

          <FormField label="Messages/Minute" description="Rate limit">
            <Input
              type="number"
              value={rules.rateLimit?.messagesPerMinute ?? 60}
              onChange={(e) => updateRateLimit('messagesPerMinute', parseInt(e.target.value) || 60)}
              disabled={!rules.rateLimit?.enabled}
              min={1}
            />
          </FormField>
        </div>
      </div>
    </SectionCard>
  );
}
