/**
 * ServerEntity - 服务器实体（聚合根）
 *
 * 服务器是运行 Agent 的计算资源，管理资源配置、网络、安全等基础设施。
 *
 * 业务规则：
 * - serverId 不能为空
 * - name 不能为空
 * - projectId 不能为空
 * - type 只能是 physical | virtual | container | cloud
 * - status 只能是 provisioning | running | stopped | maintenance | error | terminated
 * - Entity 是不可变的（更新返回新实例）
 */

export type ServerType = 'physical' | 'virtual' | 'container' | 'cloud';
export type ServerProvider = 'aws' | 'gcp' | 'azure' | 'local';
export type ServerStatus = 'provisioning' | 'running' | 'stopped' | 'maintenance' | 'error' | 'terminated';
export type NetworkProtocol = 'http' | 'https';

const VALID_SERVER_TYPES: readonly ServerType[] = ['physical', 'virtual', 'container', 'cloud'];
const VALID_SERVER_STATUSES: readonly ServerStatus[] = ['provisioning', 'running', 'stopped', 'maintenance', 'error', 'terminated'];

export interface ServerResources {
  readonly cpuCores: number;
  readonly memoryGb: number;
  readonly diskGb: number;
  readonly gpuCount?: number;
}

export interface ServerNetwork {
  readonly hostname: string;
  readonly ipAddress?: string;
  readonly port: number;
  readonly protocol: NetworkProtocol;
  readonly domain?: string;
}

export interface FirewallRule {
  readonly port: number;
  readonly protocol: 'tcp' | 'udp';
  readonly source: string;
}

export interface ServerSecurity {
  readonly sshEnabled: boolean;
  readonly sshPort?: number;
  readonly firewallRules?: readonly FirewallRule[];
  readonly sslEnabled: boolean;
  readonly sslCertPath?: string;
}

export interface ServerLimits {
  readonly maxAgents: number;
  readonly maxConcurrentExecutions: number;
  readonly maxMemoryPerAgentGb: number;
}

export interface ServerEntityProps {
  readonly serverId: string;
  readonly name: string;
  readonly description?: string;
  readonly projectId: string;
  readonly type: ServerType;
  readonly provider?: ServerProvider;
  readonly region?: string;
  readonly instanceType?: string;
  readonly resources: ServerResources;
  readonly network: ServerNetwork;
  readonly security: ServerSecurity;
  readonly limits: ServerLimits;
  readonly status: ServerStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly startedAt?: Date;
  readonly stoppedAt?: Date;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly environment?: string;
    readonly costCenter?: string;
    readonly owner?: string;
  };
}

export interface ServerEntityJSON {
  readonly server_id: string;
  readonly name: string;
  readonly description?: string;
  readonly project_id: string;
  readonly type: ServerType;
  readonly provider?: ServerProvider;
  readonly region?: string;
  readonly instance_type?: string;
  readonly resources: {
    readonly cpu_cores: number;
    readonly memory_gb: number;
    readonly disk_gb: number;
    readonly gpu_count?: number;
  };
  readonly network: {
    readonly hostname: string;
    readonly ip_address?: string;
    readonly port: number;
    readonly protocol: NetworkProtocol;
    readonly domain?: string;
  };
  readonly security: {
    readonly ssh_enabled: boolean;
    readonly ssh_port?: number;
    readonly firewall_rules?: readonly {
      readonly port: number;
      readonly protocol: 'tcp' | 'udp';
      readonly source: string;
    }[];
    readonly ssl_enabled: boolean;
    readonly ssl_cert_path?: string;
  };
  readonly limits: {
    readonly max_agents: number;
    readonly max_concurrent_executions: number;
    readonly max_memory_per_agent_gb: number;
  };
  readonly status: ServerStatus;
  readonly created_at: string;
  readonly updated_at: string;
  readonly started_at?: string;
  readonly stopped_at?: string;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly environment?: string;
    readonly cost_center?: string;
    readonly owner?: string;
  };
}

export class ServerEntity {
  private constructor(private readonly props: ServerEntityProps) {
    this.validate();
  }

  static create(props: ServerEntityProps): ServerEntity {
    return new ServerEntity(props);
  }

  static fromJSON(json: ServerEntityJSON): ServerEntity {
    return ServerEntity.create({
      serverId: json.server_id,
      name: json.name,
      description: json.description,
      projectId: json.project_id,
      type: json.type,
      provider: json.provider,
      region: json.region,
      instanceType: json.instance_type,
      resources: {
        cpuCores: json.resources.cpu_cores,
        memoryGb: json.resources.memory_gb,
        diskGb: json.resources.disk_gb,
        gpuCount: json.resources.gpu_count,
      },
      network: {
        hostname: json.network.hostname,
        ipAddress: json.network.ip_address,
        port: json.network.port,
        protocol: json.network.protocol,
        domain: json.network.domain,
      },
      security: {
        sshEnabled: json.security.ssh_enabled,
        sshPort: json.security.ssh_port,
        firewallRules: json.security.firewall_rules,
        sslEnabled: json.security.ssl_enabled,
        sslCertPath: json.security.ssl_cert_path,
      },
      limits: {
        maxAgents: json.limits.max_agents,
        maxConcurrentExecutions: json.limits.max_concurrent_executions,
        maxMemoryPerAgentGb: json.limits.max_memory_per_agent_gb,
      },
      status: json.status,
      createdAt: new Date(json.created_at),
      updatedAt: new Date(json.updated_at),
      startedAt: json.started_at ? new Date(json.started_at) : undefined,
      stoppedAt: json.stopped_at ? new Date(json.stopped_at) : undefined,
      meta: json.meta,
    });
  }

  private validate(): void {
    if (!this.props.serverId || this.props.serverId.trim() === '') {
      throw new Error('Server ID cannot be empty');
    }
    if (!this.props.name || this.props.name.trim() === '') {
      throw new Error('Server name cannot be empty');
    }
    if (!this.props.projectId || this.props.projectId.trim() === '') {
      throw new Error('Project ID cannot be empty');
    }
    if (!VALID_SERVER_TYPES.includes(this.props.type)) {
      throw new Error(`Invalid server type: ${this.props.type}. Must be one of: ${VALID_SERVER_TYPES.join(', ')}`);
    }
    if (!VALID_SERVER_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid server status: ${this.props.status}. Must be one of: ${VALID_SERVER_STATUSES.join(', ')}`);
    }

    // Validate resources
    if (this.props.resources.cpuCores <= 0) {
      throw new Error('CPU cores must be greater than 0');
    }
    if (this.props.resources.memoryGb <= 0) {
      throw new Error('Memory must be greater than 0');
    }
    if (this.props.resources.diskGb <= 0) {
      throw new Error('Disk size must be greater than 0');
    }

    // Validate limits
    if (this.props.limits.maxAgents <= 0) {
      throw new Error('Max agents must be greater than 0');
    }
    if (this.props.limits.maxConcurrentExecutions <= 0) {
      throw new Error('Max concurrent executions must be greater than 0');
    }
  }

  // --- Getters ---

  get serverId(): string { return this.props.serverId; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get projectId(): string { return this.props.projectId; }
  get type(): ServerType { return this.props.type; }
  get provider(): ServerProvider | undefined { return this.props.provider; }
  get region(): string | undefined { return this.props.region; }
  get instanceType(): string | undefined { return this.props.instanceType; }
  get resources(): ServerResources { return this.props.resources; }
  get network(): ServerNetwork { return this.props.network; }
  get security(): ServerSecurity { return this.props.security; }
  get limits(): ServerLimits { return this.props.limits; }
  get status(): ServerStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get startedAt(): Date | undefined { return this.props.startedAt; }
  get stoppedAt(): Date | undefined { return this.props.stoppedAt; }
  get meta(): ServerEntityProps['meta'] { return this.props.meta; }

  // --- Status checks ---

  isProvisioning(): boolean { return this.props.status === 'provisioning'; }
  isRunning(): boolean { return this.props.status === 'running'; }
  isStopped(): boolean { return this.props.status === 'stopped'; }
  isMaintenance(): boolean { return this.props.status === 'maintenance'; }
  isError(): boolean { return this.props.status === 'error'; }
  isTerminated(): boolean { return this.props.status === 'terminated'; }
  canStartAgents(): boolean { return this.props.status === 'running'; }

  // --- Type checks ---

  isCloud(): boolean { return this.props.type === 'cloud'; }
  isPhysical(): boolean { return this.props.type === 'physical'; }
  isVirtual(): boolean { return this.props.type === 'virtual'; }
  isContainer(): boolean { return this.props.type === 'container'; }

  // --- Resource checks ---

  hasGpu(): boolean { return (this.props.resources.gpuCount ?? 0) > 0; }

  canAccommodateAgent(memoryGb: number): boolean {
    return memoryGb <= this.props.limits.maxMemoryPerAgentGb;
  }

  // --- Immutable updates ---

  updateStatus(status: ServerStatus): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      status,
      updatedAt: new Date(),
    });
  }

  start(): ServerEntity {
    if (this.props.status !== 'stopped' && this.props.status !== 'provisioning') {
      throw new Error('Only stopped or provisioning servers can be started');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'running',
      startedAt: new Date(),
      stoppedAt: undefined,
      updatedAt: new Date(),
    });
  }

  stop(): ServerEntity {
    if (this.props.status !== 'running') {
      throw new Error('Only running servers can be stopped');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'stopped',
      stoppedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  enterMaintenance(): ServerEntity {
    if (this.props.status !== 'running') {
      throw new Error('Only running servers can enter maintenance');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'maintenance',
      updatedAt: new Date(),
    });
  }

  exitMaintenance(): ServerEntity {
    if (this.props.status !== 'maintenance') {
      throw new Error('Only servers in maintenance can exit maintenance');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'running',
      updatedAt: new Date(),
    });
  }

  markAsError(): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      status: 'error',
      updatedAt: new Date(),
    });
  }

  recover(): ServerEntity {
    if (this.props.status !== 'error') {
      throw new Error('Only servers in error state can be recovered');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'running',
      updatedAt: new Date(),
    });
  }

  terminate(): ServerEntity {
    if (this.props.status !== 'stopped') {
      throw new Error('Only stopped servers can be terminated');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'terminated',
      updatedAt: new Date(),
    });
  }

  updateName(name: string): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      name,
      updatedAt: new Date(),
    });
  }

  updateDescription(description: string): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      description,
      updatedAt: new Date(),
    });
  }

  updateResources(resources: ServerResources): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      resources,
      updatedAt: new Date(),
    });
  }

  updateLimits(limits: ServerLimits): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      limits,
      updatedAt: new Date(),
    });
  }

  // --- Equality (by ID) ---

  equals(other: ServerEntity): boolean {
    return this.props.serverId === other.props.serverId;
  }

  // --- Serialization ---

  toJSON(): ServerEntityJSON {
    return {
      server_id: this.props.serverId,
      name: this.props.name,
      description: this.props.description,
      project_id: this.props.projectId,
      type: this.props.type,
      provider: this.props.provider,
      region: this.props.region,
      instance_type: this.props.instanceType,
      resources: {
        cpu_cores: this.props.resources.cpuCores,
        memory_gb: this.props.resources.memoryGb,
        disk_gb: this.props.resources.diskGb,
        gpu_count: this.props.resources.gpuCount,
      },
      network: {
        hostname: this.props.network.hostname,
        ip_address: this.props.network.ipAddress,
        port: this.props.network.port,
        protocol: this.props.network.protocol,
        domain: this.props.network.domain,
      },
      security: {
        ssh_enabled: this.props.security.sshEnabled,
        ssh_port: this.props.security.sshPort,
        firewall_rules: this.props.security.firewallRules,
        ssl_enabled: this.props.security.sslEnabled,
        ssl_cert_path: this.props.security.sslCertPath,
      },
      limits: {
        max_agents: this.props.limits.maxAgents,
        max_concurrent_executions: this.props.limits.maxConcurrentExecutions,
        max_memory_per_agent_gb: this.props.limits.maxMemoryPerAgentGb,
      },
      status: this.props.status,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      started_at: this.props.startedAt?.toISOString(),
      stopped_at: this.props.stoppedAt?.toISOString(),
      meta: this.props.meta,
    };
  }
}
