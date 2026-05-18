import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/shared/components/layout/MainLayout';
import { lazy } from 'react';

// Lazy load page components
// eslint-disable-next-line react-refresh/only-export-components
const DashboardPage = lazy(() => import('@/features/dashboard/components/DashboardPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ChannelPage = lazy(() => import('@/features/channel/components/ChannelPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ChannelEditPage = lazy(() => import('@/features/channel/components/ChannelEditPage'));
// eslint-disable-next-line react-refresh/only-export-components
const AgentPage = lazy(() => import('@/features/agent/components/AgentPage'));
// eslint-disable-next-line react-refresh/only-export-components
const AgentEditPage = lazy(() => import('@/features/agent/components/AgentEditPage'));
// eslint-disable-next-line react-refresh/only-export-components
const OKRPage = lazy(() => import('@/features/okr/components/OKRPage'));
// eslint-disable-next-line react-refresh/only-export-components
const WorkflowPage = lazy(() => import('@/features/workflow/components/WorkflowPage'));
// eslint-disable-next-line react-refresh/only-export-components
const ProjectPage = lazy(() => import('@/features/project/components/ProjectPage'));
// eslint-disable-next-line react-refresh/only-export-components
const TerminalPage = lazy(() => import('@/features/terminal/components/TerminalPage'));
// eslint-disable-next-line react-refresh/only-export-components
const HistoryPage = lazy(() => import('@/features/history/components/HistoryPage'));
// eslint-disable-next-line react-refresh/only-export-components
const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'));
// eslint-disable-next-line react-refresh/only-export-components
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
        path: 'channels',
        element: <ChannelPage />,
      },
      {
        path: 'channels/new',
        element: <ChannelEditPage />,
      },
      {
        path: 'channels/:id/edit',
        element: <ChannelEditPage />,
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
        path: 'agents/new',
        element: <AgentEditPage />,
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
