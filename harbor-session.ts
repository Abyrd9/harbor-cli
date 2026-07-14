import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type SessionServiceInfo = {
  window: number;
  target: string;
  canAccess?: string[];
}

export type SessionInfo = {
  session: string;
  socket: string;
  startedAt: string;
  services: Record<string, SessionServiceInfo>;
}

export type HarborWindow = {
  index: string;
  name: string;
}

/** Check the real tmux socket rather than trusting cached Harbor metadata. */
export function harborSessionExists(sessionName: string, socketName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('tmux', ['-L', socketName, 'has-session', '-t', sessionName], {
      stdio: 'pipe',
    });
    process.on('error', () => resolve(false));
    process.on('close', (code) => resolve(code === 0));
  });
}

/** Detect the target Harbor session from pane metadata or tmux's socket path. */
export function isInsideHarborSession(sessionName: string, socketName: string): boolean {
  if (
    process.env.HARBOR_SESSION === sessionName &&
    process.env.HARBOR_SOCKET === socketName
  ) {
    return true;
  }

  const tmuxSocketPath = process.env.TMUX?.split(',', 1)[0];
  return tmuxSocketPath ? path.basename(tmuxSocketPath) === socketName : false;
}

function findSessionFile(startDir: string): string | null {
  const harborRoot = process.env.HARBOR_ROOT;
  if (harborRoot) {
    const sessionFile = path.join(harborRoot, '.harbor', 'session.json');
    if (fs.existsSync(sessionFile)) return sessionFile;
  }

  let currentDir = path.resolve(startDir);
  while (true) {
    const sessionFile = path.join(currentDir, '.harbor', 'session.json');
    if (fs.existsSync(sessionFile)) return sessionFile;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

/** Resolve Harbor metadata from any project directory and verify it against tmux. */
export async function getLiveHarborSession(startDir = process.cwd()): Promise<SessionInfo | null> {
  const sessionFile = findSessionFile(startDir);
  if (!sessionFile) return null;

  try {
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8')) as SessionInfo;
    return await harborSessionExists(session.session, session.socket) ? session : null;
  } catch {
    return null;
  }
}

function runTmux(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('tmux', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    process.stdout.on('data', (data) => { stdout += data.toString(); });
    process.stderr.on('data', (data) => { stderr += data.toString(); });
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr.trim() || `tmux exited with code ${code}`));
      }
    });
  });
}

/** Attach the current terminal to a Harbor session and return the tmux exit code. */
export function attachHarborSession(sessionName: string, socketName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const process = spawn(
      'tmux',
      ['-L', socketName, 'attach-session', '-t', sessionName],
      { stdio: 'inherit' }
    );
    process.on('error', reject);
    process.on('close', (code) => resolve(code ?? 0));
  });
}

/** Stop a Harbor tmux session. */
export async function killHarborSession(sessionName: string, socketName: string): Promise<void> {
  await runTmux(['-L', socketName, 'kill-session', '-t', sessionName]);
}

/** List the windows currently owned by a Harbor session. */
export async function listHarborWindows(
  sessionName: string,
  socketName: string
): Promise<HarborWindow[]> {
  const stdout = await runTmux([
    '-L', socketName, 'list-windows', '-t', sessionName, '-F', '#{window_index}|#{window_name}',
  ]);
  return stdout.trim().split('\n').filter(Boolean).map((line) => {
    const [index, name] = line.split('|');
    return { index, name };
  });
}

function getSessionService(session: SessionInfo, target: string): SessionServiceInfo {
  const service = session.services[target];
  if (!service) throw new Error(`Unknown service: ${target}`);
  return service;
}

async function requireLiveHarborSession(): Promise<SessionInfo> {
  const session = await getLiveHarborSession();
  if (!session) throw new Error('No harbor session running');
  return session;
}

/** Send a command literally to a Harbor pane without passing it through a local shell. */
export async function sendToHarborPane(target: string, command: string): Promise<void> {
  const session = await requireLiveHarborSession();
  const service = getSessionService(session, target);
  await runTmux(['-L', session.socket, 'send-keys', '-t', service.target, command, 'Enter']);
}

/** Capture recent output from a live Harbor pane. */
export async function captureHarborPane(target: string, lines = 500): Promise<string> {
  const session = await requireLiveHarborSession();
  const service = getSessionService(session, target);
  return runTmux([
    '-L', session.socket, 'capture-pane', '-t', service.target, '-p', '-S', `-${lines}`,
  ]);
}

/** Execute a command in a Harbor pane and extract output between unique markers. */
export async function executeInHarborPane(
  target: string,
  command: string,
  timeout = 3000
): Promise<string> {
  const session = await requireLiveHarborSession();
  const service = getSessionService(session, target);
  const markerId = randomUUID().slice(0, 8);
  const startMarker = `<<<HARBOR_START_${markerId}>>>`;
  const endMarker = `<<<HARBOR_END_${markerId}>>>`;
  const tmuxArgs = ['-L', session.socket, 'send-keys', '-t', service.target];

  await runTmux([...tmuxArgs, `echo '${startMarker}'`, 'Enter']);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await runTmux([...tmuxArgs, command, 'Enter']);
  await new Promise((resolve) => setTimeout(resolve, timeout));
  await runTmux([...tmuxArgs, `echo '${endMarker}'`, 'Enter']);
  await new Promise((resolve) => setTimeout(resolve, 200));

  const stdout = await runTmux([
    '-L', session.socket, 'capture-pane', '-t', service.target, '-p', '-S', '-500',
  ]);
  const markerPattern = new RegExp(
    `${escapeRegex(startMarker)}\\n([\\s\\S]*?)${escapeRegex(endMarker)}`
  );
  const match = stdout.match(markerPattern);

  if (!match) return stdout.trim() || '(no output)';

  const lines = match[1].split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.includes(`echo '${startMarker}'`)) return false;
    if (trimmed.includes(`echo '${endMarker}'`)) return false;
    return true;
  });
  return lines.join('\n').trim() || '(no output)';
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
