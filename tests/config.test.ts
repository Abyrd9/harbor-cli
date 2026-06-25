import { describe, it, expect } from 'vitest';

import { validateConfig } from '../index';

function validateRawConfig(config: unknown) {
  return validateConfig(config as Parameters<typeof validateConfig>[0]);
}

describe('Configuration Validation', () => {
  it('should validate basic service config', () => {
    const config = {
      services: [
        { name: 'test', path: './test' }
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

  it('should validate canAccess references to sibling services', () => {
    const config = {
      services: [
        {
          name: 'api',
          path: './api',
          canAccess: ['web']
        },
        {
          name: 'web',
          path: './test',
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
          canAccess: ['missing']
        }
      ]
    };
    expect(validateRawConfig(config)).toContain('unknown service');
  });

  it('should reject self-referential canAccess entries', () => {
    const config = {
      services: [
        {
          name: 'api',
          path: './test',
          canAccess: ['api']
        }
      ]
    };
    expect(validateRawConfig(config)).toContain('cannot have canAccess reference to itself');
  });

  it('should validate before scripts', () => {
    const config = {
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
    const config = {
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
    const config = {
      services: [
        { name: 'test', path: './test' }
      ],
      sessionName: 'my-project'
    };
    expect(validateConfig(config)).toBeNull();
  });
});
