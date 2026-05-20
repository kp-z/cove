import type { AppRouter } from '../../../backend/src/infrastructure/trpc/routers';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Entity type aliases (auto-inferred from backend)
export type Agent = RouterOutputs['agent']['getById'];
export type AgentList = RouterOutputs['agent']['list'];
export type Channel = RouterOutputs['channel']['getById'];
export type Message = RouterOutputs['message']['getById'];
export type Task = RouterOutputs['task']['getById'];
export type Thread = RouterOutputs['thread']['getMetadata'];
export type User = RouterOutputs['user']['getById'];
export type Workflow = RouterOutputs['workflow']['getById'];
export type Project = RouterOutputs['project']['getById'];

// Input type aliases
export type CreateAgentInput = RouterInputs['agent']['create'];
export type SendMessageInput = RouterInputs['message']['send'];
export type CreateTaskInput = RouterInputs['task']['create'];
export type CreateChannelInput = RouterInputs['channel']['create'];
export type CreateWorkflowInput = RouterInputs['workflow']['create'];
export type CreateProjectInput = RouterInputs['project']['create'];
