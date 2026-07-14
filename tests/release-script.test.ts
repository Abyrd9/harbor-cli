import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const releaseScript = path.join(__dirname, '..', 'release.sh');
const tempDirs: string[] = [];

function runGit(cwd: string, args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('Release script', () => {
  it('removes the release commit and tag when npm publication fails', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-release-'));
    const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harbor-release-remote-'));
    const binDir = path.join(tempDir, 'bin');
    const npmLogPath = path.join(remoteDir, 'npm.log');
    tempDirs.push(tempDir, remoteDir);

    fs.mkdirSync(binDir);
    fs.copyFileSync(releaseScript, path.join(tempDir, 'release.sh'));
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(
        { name: 'harbor-release-test', version: '1.0.0', scripts: { build: 'true' } },
        null,
        2
      ) + '\n'
    );
    fs.writeFileSync(path.join(tempDir, 'CHANGELOG.md'), '# Changelog\n');
    fs.writeFileSync(path.join(tempDir, 'bun.lock'), '');
    fs.mkdirSync(path.join(tempDir, 'dist'));
    fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), 'console.log("test");\n');
    fs.writeFileSync(
      path.join(binDir, 'npm'),
      '#!/bin/bash\nprintf "%s\\n" "$*" >> "$NPM_LOG"\n' +
        '[ "$1" = "whoami" ] && echo "abyrd" && exit 0\n' +
        '[ "$1" = "view" ] && exit 1\n' +
        '[ "$1" = "publish" ] && exit 42\nexit 1\n'
    );
    fs.chmodSync(path.join(binDir, 'npm'), 0o755);

    execFileSync('git', ['init', '--bare'], { cwd: remoteDir, stdio: 'ignore' });
    execFileSync('git', ['init', '-b', 'main'], { cwd: tempDir, stdio: 'ignore' });
    runGit(tempDir, ['config', 'user.name', 'Harbor Test']);
    runGit(tempDir, ['config', 'user.email', 'harbor@example.com']);
    runGit(tempDir, ['add', '.']);
    runGit(tempDir, ['commit', '-m', 'Initial']);
    runGit(tempDir, ['remote', 'add', 'origin', remoteDir]);
    runGit(tempDir, ['push', '-u', 'origin', 'main']);
    const originalHead = runGit(tempDir, ['rev-parse', 'HEAD']);

    const result = spawnSync('bash', ['release.sh'], {
      cwd: tempDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        NPM_LOG: npmLogPath,
        NPM_TOKEN: 'invalid',
        PATH: `${binDir}:${process.env.PATH}`,
      },
      input: '1\n',
      timeout: 30000,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain('Restored pre-release state');
    expect(runGit(tempDir, ['rev-parse', 'HEAD'])).toBe(originalHead);
    expect(runGit(tempDir, ['tag', '--list', 'v1.0.1'])).toBe('');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8')
    );
    expect(packageJson.version).toBe('1.0.0');
    expect(fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8')).toBe('# Changelog\n');
    expect(runGit(tempDir, ['status', '--porcelain'])).toBe('');
    const npmLog = fs.readFileSync(npmLogPath, 'utf8');
    expect(npmLog).toContain('whoami');
    expect(npmLog).toContain('publish --access public');
    expect(npmLog).not.toContain('_authToken');
  });
});
