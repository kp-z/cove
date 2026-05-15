import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/shared/components/layout/MainLayout';
import { lazy } from 'react';

const DashboardPage = lazy(() => import('@/features/dashboard/components/DashboardPage'));
const ChannelPage = lazy(() => import('@/features/channel/components/ChannelPage'));
const AgentPage = lazy(() => import('@/features/agent/components/AgentPage'));
const AgentEditPage = lazy(() => import('@/features/agent/components/AgentEditPage'));
const OKRPage = lazy(() => import('@/features/okr/components/OKRPage'));
const WorkflowPage = lazy(() => import('@/features/workflow/components/WorkflowPage'));
const ProjectPage = lazy(() => import('@/features/project/components/ProjectPage'));
const TerminalPage = lazy(() => import('@/features/terminal/components/TerminalPage'));
const HistoryPage = lazy(() => import('@/features/history/components/HistoryPage'));
const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'));
const SettingsPage = lazy(() => import('@/features/settings/components/SettingsPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'channel',
        element: <ChannelPage />,
      },
      {
        path: 'channel/:channelId',
        element: <ChannelPage />,
      },
      {
        path: 'channel/:channelId/:threadId',
        element: <ChannelPage />,
      },
      {
        path: 'agents',
        element: <AgentPage />,
      },
      {
        path: 'agents/:id/edit',
        element: <AgentEditPage />,
      },
      {
        path: 'terminal',
        element: <TerminalPage />,
      },
      {
        path: 'workflows',
        element: <WorkflowPage />,
      },
      {
        path: 'okr',
        element: <OKRPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'projects',
        element: <ProjectPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
