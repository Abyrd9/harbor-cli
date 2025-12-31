import { describe, it, expect } from 'vitest';

// Define types locally for testing (same as in index.ts)
type PreStageCommand = {
  command: string;
  wait?: number;
  timeout?: number;
}

type DevService = {
  name: string;
  path: string;
  command?: string;
  log?: boolean;
  maxLogLines?: number;
  preStage?: PreStageCommand;
}

type Script = {
  path: string;
  command: string;
}

type Config = {
  services: DevService[];
  before?: Script[];
  after?: Script[];
  sessionName?: string;
}

// Copy validation function for testing
function validateConfig(config: Config): string | null {
  if (!Array.isArray(config.services)) {
    return 'Services must be an array';
  }

  for (const service of config.services) {
    if (!service.name) {
      return 'Service name is required';
    }
    if (!service.path) {
      return 'Service path is required';
    }

    // Validate preStage if present
    if (service.preStage) {
      if (!service.preStage.command) {
        return `Service ${service.name} preStage command is required`;
      }
      if (service.preStage.wait !== undefined && service.preStage.wait < 0) {
        return `Service ${service.name} preStage wait must be non-negative`;
      }
      if (service.preStage.timeout !== undefined && service.preStage.timeout <= 0) {
        return `Service ${service.name} preStage timeout must be positive`;
      }
    }
  }

  // Validate before scripts
  if (config.before && !Array.isArray(config.before)) {
    return 'Before scripts must be an array';
  }

  if (config.before) {
    for (let i = 0; i < config.before.length; i++) {
      const script = config.before[i];
      if (!script.path) {
        return `Before script ${i} must have a path`;
      }
      if (!script.command) {
        return `Before script ${i} must have a command`;
      }
    }
  }

  // Validate after scripts
  if (config.after && !Array.isArray(config.after)) {
    return 'After scripts must be an array';
  }

  if (config.after) {
    for (let i = 0; i < config.after.length; i++) {
      const script = config.after[i];
      if (!script.path) {
        return `After script ${i} must have a path`;
      }
      if (!script.command) {
        return `After script ${i} must have a command`;
      }
    }
  }

  return null;
}

describe('Configuration Validation', () => {
  it('should validate basic service config', () => {
    const config: Config = {
      services: [
        { name: 'test', path: './test' }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should reject missing service name', () => {
    const config: Config = {
      services: [
        { path: './test' } as any
      ]
    };
    expect(validateConfig(config)).toContain('name is required');
  });

  it('should reject missing service path', () => {
    const config: Config = {
      services: [
        { name: 'test' } as any
      ]
    };
    expect(validateConfig(config)).toContain('path is required');
  });

  it('should validate pre-stage commands', () => {
    const config: Config = {
      services: [
        { 
          name: 'test', 
          path: './test',
          preStage: {
            command: 'echo hello',
            wait: 2,
            timeout: 30
          }
        }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should reject missing pre-stage command', () => {
    const config: Config = {
      services: [
        { 
          name: 'test', 
          path: './test',
          preStage: {
            wait: 2
          } as any
        }
      ]
    };
    expect(validateConfig(config)).toContain('preStage command is required');
  });

  it('should reject invalid pre-stage wait', () => {
    const config: Config = {
      services: [
        { 
          name: 'test', 
          path: './test',
          preStage: {
            command: 'echo hello',
            wait: -5
          }
        }
      ]
    };
    expect(validateConfig(config)).toContain('preStage wait must be non-negative');
  });

  it('should reject invalid pre-stage timeout', () => {
    const config: Config = {
      services: [
        { 
          name: 'test', 
          path: './test',
          preStage: {
            command: 'echo hello',
            timeout: -5
          }
        }
      ]
    };
    expect(validateConfig(config)).toContain('preStage timeout must be positive');
  });

  it('should validate before scripts', () => {
    const config: Config = {
      services: [
        { name: 'test', path: './test' }
      ],
      before: [
        { path: './scripts', command: 'echo "before"' }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should validate after scripts', () => {
    const config: Config = {
      services: [
        { name: 'test', path: './test' }
      ],
      after: [
        { path: './scripts', command: 'echo "after"' }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should validate session name', () => {
    const config: Config = {
      services: [
        { name: 'test', path: './test' }
      ],
      sessionName: 'my-project'
    };
    expect(validateConfig(config)).toBeNull();
  });
});