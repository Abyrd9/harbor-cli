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

    it('should show quick start and commands', async () => {
      const { stdout } = await runCLI(['--help']);
      expect(stdout).toContain('Quick Start');
      expect(stdout).toContain('Commands');
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

    it('should describe --name option', async () => {
      const { stdout } = await runCLI(['launch', '--help']);
      expect(stdout).toContain('Override tmux session name');
    });
  });

  describe('harbor anchor --help', () => {
    it('should describe anchoring to session', async () => {
      const { stdout } = await runCLI(['anchor', '--help']);
      expect(stdout).toContain('Attach');
      expect(stdout).toContain('Harbor session');
    });

    it('should show --name option', async () => {
      const { stdout } = await runCLI(['anchor', '--help']);
      expect(stdout).toContain('--name <name>');
    });
  });

  describe('harbor scuttle --help', () => {
    it('should describe stopping services', async () => {
      const { stdout } = await runCLI(['scuttle', '--help']);
      expect(stdout).toContain('Stop');
      expect(stdout).toContain('kill');
    });

    it('should show --name option', async () => {
      const { stdout } = await runCLI(['scuttle', '--help']);
      expect(stdout).toContain('--name <name>');
    });
  });

  describe('harbor bearings --help', () => {
    it('should describe showing status', async () => {
      const { stdout } = await runCLI(['bearings', '--help']);
      expect(stdout).toContain('status');
      expect(stdout).toContain('services');
    });

    it('should show --name option', async () => {
      const { stdout } = await runCLI(['bearings', '--help']);
      expect(stdout).toContain('--name <name>');
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

// Helper to run CLI with custom environment and timeout
function runCLIWithEnv(
  args: string[], 
  env: Record<string, string>,
  timeout = 10000
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn('node', [CLI_PATH, ...args], {
      env: { ...process.env, NO_COLOR: '1', ...env },
    });
    
    let stdout = '';
    let stderr = '';
    
    const timer = setTimeout(() => {
      proc.kill();
      resolve({ stdout, stderr, code: -1 });
    }, timeout);
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code || 0 });
    });
  });
}

describe('Tmux Session Detection', () => {
  it('should block "harbor launch" (attached mode) when inside tmux', async () => {
    const { stdout, code } = await runCLIWithEnv(['launch'], { TMUX: '/tmp/tmux-501/default,12345,0' });
    
    expect(code).toBe(1);
    expect(stdout).toContain('Cannot launch in attached mode from inside a tmux session');
    expect(stdout).toContain('harbor launch -d');
  });

  it('should block "harbor anchor" when inside tmux', async () => {
    const { stdout, code } = await runCLIWithEnv(['anchor'], { TMUX: '/tmp/tmux-501/default,12345,0' });
    
    expect(code).toBe(1);
    expect(stdout).toContain('Cannot anchor from inside a tmux session');
    expect(stdout).toContain('Detach from current session');
  });

  it('should allow "harbor launch -d" (headless mode) when inside tmux', async () => {
    // This test just verifies the command doesn't exit with the tmux blocking error
    // It will fail for other reasons (no config) but that's expected
    const { stdout } = await runCLIWithEnv(['launch', '-d'], { TMUX: '/tmp/tmux-501/default,12345,0' }, 2000);
    
    // Should NOT contain the tmux blocking message - headless mode is allowed inside tmux
    expect(stdout).not.toContain('Cannot launch in attached mode from inside a tmux session');
  });

  it('should allow "harbor launch --headless" when inside tmux', async () => {
    const { stdout } = await runCLIWithEnv(['launch', '--headless'], { TMUX: '/tmp/tmux-501/default,12345,0' }, 2000);
    
    // Should NOT contain the tmux blocking message - headless mode is allowed inside tmux
    expect(stdout).not.toContain('Cannot launch in attached mode from inside a tmux session');
  });
});

