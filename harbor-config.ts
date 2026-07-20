/** A service Harbor launches in its own tmux window. */
export interface DevService {
  name: string;
  path: string;
  command: string;
  log?: boolean;
  maxLogLines?: number;
  canAccess?: string[];
}

/** A command Harbor runs before launch or after shutdown. */
export interface Script {
  path: string;
  command: string;
}

/** The Harbor configuration read from harbor.json or package.json. */
export interface Config {
  services: DevService[];
  before?: Script[];
  after?: Script[];
  sessionName?: string;
}

/** Return the first actionable configuration error, or null when the config is valid. */
export function validateConfig(config: Config): string | null {
  if (!Array.isArray(config.services)) return 'Services must be an array';

  const serviceNames = new Set(config.services.map((service) => service.name));

  for (const service of config.services) {
    if (!service.name) return 'Service name is required';
    if (!service.path) return 'Service path is required';
    if (!service.command) return 'Service command is required';

    if (service.canAccess) {
      for (const targetName of service.canAccess) {
        if (!serviceNames.has(targetName)) {
          return `Service "${service.name}" has canAccess reference to unknown service "${targetName}"`;
        }
        if (targetName === service.name) {
          return `Service "${service.name}" cannot have canAccess reference to itself`;
        }
      }
    }
  }

  if (config.before && !Array.isArray(config.before)) return 'Before scripts must be an array';

  if (config.before) {
    for (let i = 0; i < config.before.length; i++) {
      const script = config.before[i];
      if (!script.path) return `Before script ${i} must have a path`;
      if (!script.command) return `Before script ${i} must have a command`;
    }
  }

  if (config.after && !Array.isArray(config.after)) return 'After scripts must be an array';

  if (config.after) {
    for (let i = 0; i < config.after.length; i++) {
      const script = config.after[i];
      if (!script.path) return `After script ${i} must have a path`;
      if (!script.command) return `After script ${i} must have a command`;
    }
  }

  return null;
}
