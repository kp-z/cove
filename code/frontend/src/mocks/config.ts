export interface MswConfig {
  enabled: boolean;
  delay: {
    default: number;
    min: number;
    max: number;
    random: boolean;
  };
  errors: {
    enabled: boolean;
    probability: number;
  };
  logging: {
    requests: boolean;
    responses: boolean;
  };
}

const isDevelopment = import.meta.env.MODE === 'development';
const isTest = import.meta.env.MODE === 'test';

export const mswConfig: MswConfig = {
  enabled: isDevelopment || isTest,

  delay: {
    default: isTest ? 0 : 300,
    min: 100,
    max: 1000,
    random: !isTest,
  },

  errors: {
    enabled: false,
    probability: 0.1,
  },

  logging: {
    requests: isDevelopment,
    responses: isDevelopment,
  },
};

export function getDelay(): number {
  const { delay } = mswConfig;

  if (!delay.random) {
    return delay.default;
  }

  return Math.floor(
    Math.random() * (delay.max - delay.min) + delay.min
  );
}

export function shouldReturnError(): boolean {
  const { errors } = mswConfig;

  if (!errors.enabled) {
    return false;
  }

  return Math.random() < errors.probability;
}
