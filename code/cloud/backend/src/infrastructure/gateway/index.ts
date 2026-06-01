/**
 * Backend Gateway Exports
 *
 * 统一导出 BackendGateway 相关的所有接口和实现
 */

// Interfaces
export type {
  IBackendGateway,
  RealmConfiguration,
  AgentConfig,
  RealmSettings,
  RetryPolicy,
  ConfigChange,
  ConfigDiff,
  Message,
  AgentResponse,
  DeviceHealth,
  AdapterRelease
} from './backend-gateway.interface'

// Implementations
export { TrpcBackendGateway } from './trpc-backend-gateway'
export type { TrpcClientConfig } from './trpc-backend-gateway'
