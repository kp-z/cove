import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/shared/components/layout/MainLayout';

// 懒加载页面组件
import { lazy } from 'react';

const DashboardPage = lazy(() => import('@/features/dashboard/components/DashboardPage'));
const ChannelPage = lazy(() => import('@/features/channel/components/ChannelPage'));
const AgentPage = lazy(() => import('@/features/agent/components/AgentPage'));
const OKRPage = lazy(() => import('@/features/okr/components/OKRPage'));
const WorkflowPage = lazy(() => import('@/features/workflow/components/WorkflowPage'));
const ProjectPage = lazy(() => import('@/features/project/components/ProjectPage'));
const TerminalPage = lazy(() => import('@/features/terminal/components/TerminalPage'));
const HistoryPage = lazy(() => import('@/features/history/components/HistoryPage'));

export const router = createBrowserRouter([
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
        path: 'agents',
        element: <AgentPage />,
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
        element: <div className="p-6">Settings Page (Coming Soon)</div>,
      },
    ],
  },
]);
