import Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv();

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DeployConfig {
  version: string;
  type: 'backend' | 'frontend';
  runtime: {
    type: 'node' | 'python' | 'go';
    version: string;
  };
  build: {
    command: string;
    outputDir: string;
    env?: Record<string, string>;
  };
  start?: {
    command: string;
    port: number;
    env?: Record<string, string>;
  };
  health?: {
    endpoint: string;
    timeout?: number;
    interval?: number;
  };
  serve?: {
    type: 'static' | 'ssr';
    port?: number;
    spa?: boolean;
    headers?: Record<string, string>;
  };
  dependencies?: Record<string, {
    version: string;
    required?: boolean;
  }>;
  resources?: {
    memory?: string;
    cpu?: string;
  };
}

let schemaValidator: any = null;

function loadSchema(): any {
  if (schemaValidator) {
    return schemaValidator;
  }

  const schemaPath = path.join(__dirname, '../../../schemas/deploy-config.schema.json');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  schemaValidator = ajv.compile(schema);
  return schemaValidator;
}

export function validateDeployConfig(configPath: string): ValidationResult {
  // 1. Check if file exists
  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      errors: [`配置文件不存在: ${configPath}`]
    };
  }

  // 2. Parse JSON
  let config: DeployConfig;
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(content);
  } catch (error: any) {
    return {
      valid: false,
      errors: [`配置文件格式错误: ${error.message}`]
    };
  }

  // 3. JSON Schema validation
  const validate = loadSchema();
  const valid = validate(config);

  if (!valid) {
    const schemaErrors = validate.errors?.map((err: any) => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    }) || [];

    return {
      valid: false,
      errors: schemaErrors
    };
  }

  // 4. Business logic validation
  const businessErrors: string[] = [];

  if (config.type === 'backend') {
    // Backend must have health check endpoint
    if (!config.health?.endpoint) {
      businessErrors.push('后端项目必须配置 health.endpoint');
    }

    // Port must be in valid range
    if (config.start && (config.start.port < 1 || config.start.port > 65535)) {
      businessErrors.push('端口必须在 1-65535 范围内');
    }

    // Health endpoint must start with /
    if (config.health?.endpoint && !config.health.endpoint.startsWith('/')) {
      businessErrors.push('health.endpoint 必须以 / 开头');
    }
  }

  if (config.type === 'frontend') {
    // Frontend must specify serve type
    if (!config.serve?.type) {
      businessErrors.push('前端项目必须配置 serve.type');
    }
  }

  // Validate build output directory
  if (config.build.outputDir.includes('..')) {
    businessErrors.push('build.outputDir 不能包含 .. 路径');
  }

  return {
    valid: businessErrors.length === 0,
    errors: businessErrors
  };
}

export function loadDeployConfig(configPath: string): DeployConfig {
  const content = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(content);
}
