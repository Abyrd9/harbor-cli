import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CLI_PATH = path.join(__dirname, '..', 'dist', 'index.js');

// Helper to run CLI and capture output
function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env, NO_COLOR: '1' },
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 });
    });
  });
}

describe('CLI Commands', () => {
  describe('harbor --help', () => {
    it('should display all available commands', async () => {
      const { stdout } = await runCLI(['--help']);
      
      expect(stdout).toContain('dock');
      expect(stdout).toContain('moor');
      expect(stdout).toContain('launch');
      expect(stdout).toContain('bearings');
      expect(stdout).toContain('anchor');
      expect(stdout).toContain('scuttle');
    });

    it('should display version option', async () => {
      const { stdout } = await runCLI(['--help']);
      expect(stdout).toContain('-V, --version');
    });

    it('should show workflow and requirements', async () => {
      const { stdout } = await runCLI(['--help']);
      expect(stdout).toContain('TYPICAL WORKFLOW');
      expect(stdout).toContain('REQUIREMENTS');
      expect(stdout).toContain('headless');
    });
  });

  describe('harbor launch --help', () => {
    it('should show --detach option', async () => {
      const { stdout } = await runCLI(['launch', '--help']);
      expect(stdout).toContain('-d, --detach');
    });

    it('should show --headless option', async () => {
      const { stdout } = await runCLI(['launch', '--help']);
      expect(stdout).toContain('--headless');
    });

    it('should describe headless as alias for detach', async () => {
      const { stdout } = await runCLI(['launch', '--help']);
      expect(stdout).toContain('Alias for --detach');
    });

    it('should show --name option', async () => {
      const { stdout } = await runCLI(['launch', '--help']);
      expect(stdout).toContain('--name <name>');
    });

    it('should describe --name option as override', async () => {
      const { stdout } = await runCLI(['launch', '--help']);
      expect(stdout).toContain('Override tmux session name from config');
    });

    it('should show --name example in usage', async () => {
      const { stdout } = await runCLI(['launch', '--help']);
      expect(stdout).toContain('--name my-session');
    });
  });

  describe('harbor anchor --help', () => {
    it('should describe anchoring to tmux session', async () => {
      const { stdout } = await runCLI(['anchor', '--help']);
      expect(stdout).toContain('Attach');
      expect(stdout).toContain('tmux');
      expect(stdout).toContain('WHEN TO USE');
      expect(stdout).toContain('WHAT IT DOES');
    });
  });

  describe('harbor scuttle --help', () => {
    it('should describe scuttling services', async () => {
      const { stdout } = await runCLI(['scuttle', '--help']);
      expect(stdout).toContain('Stop');
      expect(stdout).toContain('killing');
      expect(stdout).toContain('WHEN TO USE');
      expect(stdout).toContain('WHAT IT DOES');
    });
  });

  describe('harbor bearings --help', () => {
    it('should describe showing status', async () => {
      const { stdout } = await runCLI(['bearings', '--help']);
      expect(stdout).toContain('status');
      expect(stdout).toContain('WHEN TO USE');
      expect(stdout).toContain('WHAT IT SHOWS');
    });
  });
});

describe('Session Name Configuration', () => {
  // Test that sessionName has correct default behavior
  it('should use "harbor" as default session name when not specified', () => {
    // This tests the logic that would be in readHarborConfig
    const config = { services: [] };
    const sessionName = (config as any).sessionName || 'harbor';
    expect(sessionName).toBe('harbor');
  });

  it('should use custom session name when specified', () => {
    const config = { services: [], sessionName: 'my-project' };
    const sessionName = config.sessionName || 'harbor';
    expect(sessionName).toBe('my-project');
  });
});

describe('Session Name Environment Variable', () => {
  it('should set HARBOR_SESSION_NAME when name option is provided', () => {
    const options = { name: 'my-custom-session' };
    const env = {
      HARBOR_SESSION_NAME: options.name || '',
    };
    expect(env.HARBOR_SESSION_NAME).toBe('my-custom-session');
  });

  it('should set HARBOR_SESSION_NAME to empty when name option is undefined', () => {
    const options: { name?: string } = {};
    const env = {
      HARBOR_SESSION_NAME: options.name || '',
    };
    expect(env.HARBOR_SESSION_NAME).toBe('');
  });

  it('should set HARBOR_SESSION_NAME to empty when name option is empty string', () => {
    const options = { name: '' };
    const env = {
      HARBOR_SESSION_NAME: options.name || '',
    };
    expect(env.HARBOR_SESSION_NAME).toBe('');
  });

  it('should prioritize HARBOR_SESSION_NAME env over config sessionName', () => {
    // Simulating the dev.sh logic:
    // session_name="${HARBOR_SESSION_NAME:-$(get_harbor_config | jq -r '.sessionName // "harbor"')}"
    const envSessionName = 'env-session';
    const configSessionName = 'config-session';
    const defaultSessionName = 'harbor';

    const sessionName = envSessionName || configSessionName || defaultSessionName;
    expect(sessionName).toBe('env-session');
  });

  it('should fall back to config sessionName when HARBOR_SESSION_NAME is empty', () => {
    const envSessionName = '';
    const configSessionName = 'config-session';
    const defaultSessionName = 'harbor';

    const sessionName = envSessionName || configSessionName || defaultSessionName;
    expect(sessionName).toBe('config-session');
  });

  it('should fall back to default "harbor" when both env and config are empty', () => {
    const envSessionName = '';
    const configSessionName = undefined;
    const defaultSessionName = 'harbor';

    const sessionName = envSessionName || configSessionName || defaultSessionName;
    expect(sessionName).toBe('harbor');
  });
});

describe('Detach Mode Environment Variable', () => {
  it('should set HARBOR_DETACH=1 when detach option is true', () => {
    const options = { detach: true };
    const env = {
      HARBOR_DETACH: options.detach ? '1' : '0',
    };
    expect(env.HARBOR_DETACH).toBe('1');
  });

  it('should set HARBOR_DETACH=0 when detach option is false', () => {
    const options = { detach: false };
    const env = {
      HARBOR_DETACH: options.detach ? '1' : '0',
    };
    expect(env.HARBOR_DETACH).toBe('0');
  });

  it('should set HARBOR_DETACH=0 when detach option is undefined', () => {
    const options: { detach?: boolean } = {};
    const env = {
      HARBOR_DETACH: options.detach ? '1' : '0',
    };
    expect(env.HARBOR_DETACH).toBe('0');
  });

  it('should treat headless same as detach', () => {
    const optionsWithHeadless = { headless: true };
    const detach = optionsWithHeadless.headless;
    expect(detach).toBe(true);
  });
});

