/** Return the first actionable configuration error, or null when the config is valid. */
export function validateConfig(config) {
    if (!Array.isArray(config.services))
        return 'Services must be an array';
    const serviceNames = new Set();
    for (let i = 0; i < config.services.length; i++) {
        const service = config.services[i];
        if (!service || typeof service !== 'object')
            return `Service ${i} must be an object`;
        if (!service.name)
            return 'Service name is required';
        if (!service.path)
            return 'Service path is required';
        if (typeof service.command !== 'string')
            return 'Service command is required';
        if (service.canAccess !== undefined && !Array.isArray(service.canAccess)) {
            return `Service "${service.name}" canAccess must be an array`;
        }
        serviceNames.add(service.name);
    }
    for (const service of config.services) {
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
    if (config.before && !Array.isArray(config.before))
        return 'Before scripts must be an array';
    if (config.before) {
        for (let i = 0; i < config.before.length; i++) {
            const script = config.before[i];
            if (!script || typeof script !== 'object')
                return `Before script ${i} must be an object`;
            if (!script.path)
                return `Before script ${i} must have a path`;
            if (!script.command)
                return `Before script ${i} must have a command`;
        }
    }
    if (config.after && !Array.isArray(config.after))
        return 'After scripts must be an array';
    if (config.after) {
        for (let i = 0; i < config.after.length; i++) {
            const script = config.after[i];
            if (!script || typeof script !== 'object')
                return `After script ${i} must be an object`;
            if (!script.path)
                return `After script ${i} must have a path`;
            if (!script.command)
                return `After script ${i} must have a command`;
        }
    }
    return null;
}
