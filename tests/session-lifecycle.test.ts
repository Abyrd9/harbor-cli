import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const cliPath = path.join(__dirname, '..', 'dist', 'index.js');
const tempDirs: string[] = [];

function runCLI(
  args: string[],
  options: { cwd: string; env?: Record<string, string>; timeout?: number }
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const process = spawn('node', [cliPath, ...args], {
      cwd: options.cwd,
      env: { ...globalThis.process.env, NO_COLOR: '1', ...options.env },
    });
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => { stdout += data.toString(); });
    process.stderr.on('data', (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      process.kill();
      resolve({ stdout, stderr, code: -1 });
    }, options.timeout ?? 5000);

    process.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 0 });
    });
  });
}

function createFakeTmux(tempDir: string) {
  const binDir = path.join(tempDir, 'bin');
  const statePath = path.join(tempDir, 'tmux-state');
  const logPath = path.join(tempDir, 'tmux.log');
  fs.mkdirSync(binDir);
  fs.writeFileSync(
    path.join(binDir, 'tmux'),
    `#!/bin/bash
if [ "$1" = "-V" ]; then
  echo "tmux 3.4"
  exit 0
fi
if [ "$1" = "-L" ]; then
  shift 2
fi
command="$1"
shift
printf '%s\\n' "$command $*" >> "$HARBOR_TMUX_LOG"
case "$command" in
  has-session) [ -f "$HARBOR_TMUX_STATE" ] ;;
  new-session) printf '%s\\n' "$RANDOM-$RANDOM" > "$HARBOR_TMUX_STATE" ;;
  kill-session) rm -f "$HARBOR_TMUX_STATE" ;;
  display-message) cat "$HARBOR_TMUX_STATE" ;;
  *) exit 0 ;;
esac
`
  );
  fs.chmodSync(path.join(binDir, 'tmux'), 0o755);
  return {
    env: {
      PATH: `${binDir}:${process.env.PATH}`,
      HARBOR_TMUX_LOG: logPath,
      HARBOR_TMUX_STATE: statePath,
    },
    logPath,
    statePath,
  };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('Session lifecycle', () => {
  it('keeps an existing session running when launch is called again', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-idempotent-launch-'));
    const sessionName = `harbor-idempotent-${process.pid}-${Date.now()}`;
    tempDirs.push(tempDir);
    const tmux = createFakeTmux(tempDir);

    fs.writeFileSync(
      path.join(tempDir, 'harbor.json'),
      JSON.stringify({
        sessionName,
        services: [{ name: 'worker', path: tempDir, command: 'sleep 30' }],
      })
    );

    const firstLaunch = await runCLI(['launch', '-d'], { cwd: tempDir, env: tmux.env });
    expect(firstLaunch.code, firstLaunch.stderr || firstLaunch.stdout).toBe(0);
    const firstSessionId = fs.readFileSync(tmux.statePath, 'utf-8');

    const secondLaunch = await runCLI(['launch', '-d'], { cwd: tempDir, env: tmux.env });

    expect(secondLaunch.code).toBe(0);
    expect(secondLaunch.stdout).toContain('already running');
    expect(fs.readFileSync(tmux.statePath, 'utf-8')).toBe(firstSessionId);
  });

  it('requires explicit replacement and refuses to replace the caller session', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-replace-launch-'));
    const sessionName = `harbor-replace-${process.pid}-${Date.now()}`;
    const socketName = `harbor-${sessionName}`;
    tempDirs.push(tempDir);
    const tmux = createFakeTmux(tempDir);
    fs.writeFileSync(
      path.join(tempDir, 'harbor.json'),
      JSON.stringify({
        sessionName,
        services: [{ name: 'worker', path: tempDir, command: 'sleep 30' }],
      })
    );
    await runCLI(['launch', '-d'], { cwd: tempDir, env: tmux.env });
    const firstSessionId = fs.readFileSync(tmux.statePath, 'utf-8');

    const selfReplace = await runCLI(['launch', '-d', '--replace'], {
      cwd: tempDir,
      env: { ...tmux.env, TMUX: `/tmp/tmux-501/${socketName},12345,0` },
    });

    expect(selfReplace.code).toBe(1);
    expect(selfReplace.stdout).toContain('Cannot replace the Harbor session');
    expect(fs.readFileSync(tmux.statePath, 'utf-8')).toBe(firstSessionId);

    const externalReplace = await runCLI(['launch', '-d', '--replace'], {
      cwd: tempDir,
      env: tmux.env,
    });

    expect(externalReplace.code).toBe(0);
    expect(externalReplace.stdout).toContain('Replacing existing tmux session');
    expect(fs.readFileSync(tmux.statePath, 'utf-8')).not.toBe(firstSessionId);
  });

  it('ignores session metadata when its tmux session is no longer running', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-stale-session-'));
    const harborDir = path.join(tempDir, '.harbor');
    tempDirs.push(tempDir);
    const tmux = createFakeTmux(tempDir);
    fs.mkdirSync(harborDir);
    fs.writeFileSync(
      path.join(harborDir, 'session.json'),
      JSON.stringify({
        session: 'stale-session',
        socket: 'harbor-stale-session',
        startedAt: '2026-07-01T00:00:00Z',
        services: {},
      })
    );

    const result = await runCLI(['context'], { cwd: tempDir, env: tmux.env });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('No active harbor session found');
    expect(result.stdout).not.toContain('stale-session');
  });

  it('exports the Harbor project root to launched service panes', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-root-env-'));
    const sessionName = `harbor-root-${process.pid}-${Date.now()}`;
    tempDirs.push(tempDir);
    const tmux = createFakeTmux(tempDir);
    fs.writeFileSync(
      path.join(tempDir, 'harbor.json'),
      JSON.stringify({
        sessionName,
        services: [{ name: 'worker', path: tempDir, command: 'sleep 30' }],
      })
    );

    const result = await runCLI(['launch', '-d'], { cwd: tempDir, env: tmux.env });

    expect(result.code, result.stderr || result.stdout).toBe(0);
    expect(fs.readFileSync(tmux.logPath, 'utf-8')).toContain(
      `HARBOR_ROOT='${fs.realpathSync(tempDir)}'`
    );
  });

  it('resolves the live session from a service working directory', async () => {
    const harborRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-root-'));
    const serviceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-service-'));
    const harborDir = path.join(harborRoot, '.harbor');
    tempDirs.push(harborRoot, serviceDir);
    const tmux = createFakeTmux(harborRoot);
    fs.mkdirSync(harborDir);
    fs.writeFileSync(tmux.statePath, 'live-session');
    fs.writeFileSync(
      path.join(harborDir, 'session.json'),
      JSON.stringify({
        session: 'nested-session',
        socket: 'harbor-nested-session',
        startedAt: '2026-07-14T00:00:00Z',
        services: {},
      })
    );

    const result = await runCLI(['context'], {
      cwd: serviceDir,
      env: { ...tmux.env, HARBOR_ROOT: harborRoot },
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('**Session**: nested-session');
  });

  it('forwards shell syntax to the pane without executing it locally', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-literal-hail-'));
    const harborDir = path.join(tempDir, '.harbor');
    const sentinelPath = path.join(tempDir, 'local-expansion-ran');
    tempDirs.push(tempDir);
    const tmux = createFakeTmux(tempDir);
    fs.mkdirSync(harborDir);
    fs.writeFileSync(tmux.statePath, 'live-session');
    fs.writeFileSync(
      path.join(harborDir, 'session.json'),
      JSON.stringify({
        session: 'literal-session',
        socket: 'harbor-literal-session',
        startedAt: '2026-07-14T00:00:00Z',
        services: {
          worker: { window: 1, target: 'literal-session:1', canAccess: [] },
        },
      })
    );
    const command = `printf '%s\\n' '$(touch ${sentinelPath})'`;

    const result = await runCLI(['hail', 'worker', command], { cwd: tempDir, env: tmux.env });

    expect(result.code).toBe(0);
    expect(fs.existsSync(sentinelPath)).toBe(false);
    expect(fs.readFileSync(tmux.logPath, 'utf-8')).toContain(`$(touch ${sentinelPath})`);
  });
});
