import { describe, it, expect } from 'vitest';
import path from 'node:path';

import { validateConfig } from '../harbor-config';
import { resolvePackageRoot } from '../index';

function validateRawConfig(config: unknown) {
  return validateConfig(config as Parameters<typeof validateConfig>[0]);
}

describe('Configuration Validation', () => {
  it('should validate basic service config', () => {
    const config = {
      services: [
        { name: 'test', path: './test', command: 'bun run dev' }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should reject missing service name', () => {
    const config = {
      services: [
        { path: './test' }
      ]
    };
    expect(validateRawConfig(config)).toContain('name is required');
  });

  it('should reject missing service path', () => {
    const config = {
      services: [
        { name: 'test' }
      ]
    };
    expect(validateRawConfig(config)).toContain('path is required');
  });

  it('should reject missing service command', () => {
    const config = {
      services: [
        { name: 'test', path: './test' }
      ]
    };
    expect(validateRawConfig(config)).toContain('command is required');
  });

  it('should reject non-object service entries', () => {
    const config = {
      services: [null]
    };
    expect(validateRawConfig(config)).toContain('Service 0 must be an object');
  });

  it('should validate canAccess references to sibling services', () => {
    const config = {
      services: [
        {
          name: 'api',
          path: './api',
          command: 'bun run dev',
          canAccess: ['web']
        },
        {
          name: 'web',
          path: './test',
          command: 'bun run dev',
        }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should reject canAccess references to unknown services', () => {
    const config = {
      services: [
        {
          name: 'api',
          path: './test',
          command: 'bun run dev',
          canAccess: ['missing']
        }
      ]
    };
    expect(validateRawConfig(config)).toContain('unknown service');
  });

  it('should reject non-array canAccess values', () => {
    const config = {
      services: [
        {
          name: 'api',
          path: './test',
          command: 'bun run dev',
          canAccess: 'web'
        }
      ]
    };
    expect(validateRawConfig(config)).toContain('canAccess must be an array');
  });

  it('should reject self-referential canAccess entries', () => {
    const config = {
      services: [
        {
          name: 'api',
          path: './test',
          command: 'bun run dev',
          canAccess: ['api']
        }
      ]
    };
    expect(validateRawConfig(config)).toContain('cannot have canAccess reference to itself');
  });

  it('should validate before scripts', () => {
    const config = {
      services: [
        { name: 'test', path: './test', command: 'bun run dev' }
      ],
      before: [
        { path: './scripts', command: 'echo "before"' }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should validate after scripts', () => {
    const config = {
      services: [
        { name: 'test', path: './test', command: 'bun run dev' }
      ],
      after: [
        { path: './scripts', command: 'echo "after"' }
      ]
    };
    expect(validateConfig(config)).toBeNull();
  });

  it('should validate session name', () => {
    const config = {
      services: [
        { name: 'test', path: './test', command: 'bun run dev' }
      ],
      sessionName: 'my-project'
    };
    expect(validateConfig(config)).toBeNull();
  });
});

describe('Package Root Resolution', () => {
  it('keeps the repo root when running from source', () => {
    expect(resolvePackageRoot(process.cwd())).toBe(process.cwd());
  });

  it('walks up from dist to the repo root', () => {
    expect(resolvePackageRoot(path.join(process.cwd(), 'dist'))).toBe(process.cwd());
  });
});
