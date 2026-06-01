/**
 * LoginFlowOrchestrator - 登录流程协调器
 *
 * 职责：
 * - 集中管理登录后的流程决策
 * - LoginPage 不需要知道具体的流程
 * - 易于添加新的流程分支
 */

import { FirstLoginWizard } from '@/features/realm/components/FirstLoginWizard';
import { RealmSelector } from '@/features/realm/components/RealmSelector';
import type { RealmInfo } from '@/features/realm/components';

interface UserContext {
  isFirstLogin: boolean;
  realms: RealmInfo[];
  preferences: {
    lastAccessedRealmId?: string;
    pinnedRealmIds?: string[];
  };
}

interface LoginFlowOrchestratorProps {
  context: UserContext;
}

export function LoginFlowOrchestrator({ context }: LoginFlowOrchestratorProps) {
  // 决策逻辑
  if (context.isFirstLogin) {
    return <FirstLoginWizard realms={context.realms} />;
  }

  // 总是显示 Realm 选择器，让用户选择
  return <RealmSelector realms={context.realms} />;
}
