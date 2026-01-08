#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import readline from 'node:readline';
import pc from 'picocolors';

// Colored output helpers
const log = {
  error: (msg: string) => console.log(`${pc.red('✗')} ${msg}`),
  success: (msg: string) => console.log(`${pc.green('✓')} ${msg}`),
  info: (msg: string) => console.log(`${pc.blue('ℹ')} ${msg}`),
  warn: (msg: string) => console.log(`${pc.yellow('⚠')} ${msg}`),
  step: (msg: string) => console.log(`${pc.cyan('→')} ${msg}`),
  dim: (msg: string) => console.log(pc.dim(msg)),
  plain: (msg: string) => console.log(msg),
  header: (msg: string) => console.log(`\n${pc.bold(msg)}`),
  cmd: (msg: string) => console.log(`  ${pc.dim('$')} ${pc.cyan(msg)}`),
  label: (label: string, value: string) => console.log(`   ${pc.dim(label)}  ${value}`),
};

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

interface Dependency {
  name: string;
  command: string;
  installMsg: string;
  requiredFor: string;
}

interface OSInfo {
  platform: string;
  arch: string;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  isWSL: boolean;
}

const requiredDependencies: Dependency[] = [
  {
    name: 'tmux',
    command: 'tmux -V',
    installMsg: 'https://github.com/tmux/tmux/wiki/Installing',
    requiredFor: 'terminal multiplexing',
  },
  {
    name: 'jq',
    command: 'jq --version',
    installMsg: 'https://stedolan.github.io/jq/download/',
    requiredFor: 'JSON processing in service management',
  },
];

function detectOS(): OSInfo {
  const platform = os.platform();
  const arch = os.arch();
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';
  
  // Check if running in WSL
  let isWSL = false;
  if (isLinux) {
    try {
      const release = fs.readFileSync('/proc/version', 'utf-8');
      isWSL = release.toLowerCase().includes('microsoft') || release.toLowerCase().includes('wsl');
    } catch {
      // If we can't read /proc/version, assume not WSL
    }
  }
  
  return {
    platform,
    arch,
    isWindows,
    isMac,
    isLinux,
    isWSL,
  };
}

function getInstallInstructions(dependency: string, osInfo: OSInfo): string[] {
  const instructions: string[] = [];
  
  if (dependency === 'tmux') {
    if (osInfo.isMac) {
      instructions.push('🍎 macOS:');
      instructions.push('  • Using Homebrew: brew install tmux');
      instructions.push('  • Using MacPorts: sudo port install tmux');
      instructions.push('  • Manual: https://github.com/tmux/tmux/wiki/Installing');
    } else if (osInfo.isLinux) {
      if (osInfo.isWSL) {
        instructions.push('🐧 WSL/Linux:');
        instructions.push('  • Ubuntu/Debian: sudo apt update && sudo apt install tmux');
        instructions.push('  • CentOS/RHEL: sudo yum install tmux');
        instructions.push('  • Fedora: sudo dnf install tmux');
        instructions.push('  • Arch: sudo pacman -S tmux');
        instructions.push('  • openSUSE: sudo zypper install tmux');
      } else {
        instructions.push('🐧 Linux:');
        instructions.push('  • Ubuntu/Debian: sudo apt update && sudo apt install tmux');
        instructions.push('  • CentOS/RHEL: sudo yum install tmux');
        instructions.push('  • Fedora: sudo dnf install tmux');
        instructions.push('  • Arch: sudo pacman -S tmux');
        instructions.push('  • openSUSE: sudo zypper install tmux');
      }
    } else if (osInfo.isWindows) {
      instructions.push('🪟 Windows:');
      instructions.push('  • Using Chocolatey: choco install tmux');
      instructions.push('  • Using Scoop: scoop install tmux');
      instructions.push('  • Using WSL: Install in WSL and use from there');
      instructions.push('  • Manual: https://github.com/tmux/tmux/wiki/Installing');
    }
  } else if (dependency === 'jq') {
    if (osInfo.isMac) {
      instructions.push('🍎 macOS:');
      instructions.push('  • Using Homebrew: brew install jq');
      instructions.push('  • Using MacPorts: sudo port install jq');
      instructions.push('  • Using Fink: fink install jq');
      instructions.push('  • Manual: https://jqlang.org/download/');
    } else if (osInfo.isLinux) {
      if (osInfo.isWSL) {
        instructions.push('🐧 WSL/Linux:');
        instructions.push('  • Ubuntu/Debian: sudo apt update && sudo apt install jq');
        instructions.push('  • CentOS/RHEL: sudo yum install jq');
        instructions.push('  • Fedora: sudo dnf install jq');
        instructions.push('  • Arch: sudo pacman -S jq');
        instructions.push('  • openSUSE: sudo zypper install jq');
      } else {
        instructions.push('🐧 Linux:');
        instructions.push('  • Ubuntu/Debian: sudo apt update && sudo apt install jq');
        instructions.push('  • CentOS/RHEL: sudo yum install jq');
        instructions.push('  • Fedora: sudo dnf install jq');
        instructions.push('  • Arch: sudo pacman -S jq');
        instructions.push('  • openSUSE: sudo zypper install jq');
      }
    } else if (osInfo.isWindows) {
      instructions.push('🪟 Windows:');
      instructions.push('  • Using winget: winget install jqlang.jq');
      instructions.push('  • Using Chocolatey: choco install jq');
      instructions.push('  • Using Scoop: scoop install jq');
      instructions.push('  • Using WSL: Install in WSL and use from there');
      instructions.push('  • Manual: https://jqlang.org/download/');
    }
  }
  
  return instructions;
}

async function checkDependencies(): Promise<void> {
  const missingDeps: Dependency[] = [];
  const osInfo = detectOS();

  for (const dep of requiredDependencies) {
    try {
      await new Promise((resolve, reject) => {
        const process = spawn('sh', ['-c', dep.command]);
        process.on('close', (code) => {
          if (code === 0) resolve(null);
          else reject();
        });
      });
    } catch {
      missingDeps.push(dep);
    }
  }

  if (missingDeps.length > 0) {
    log.error('Missing required dependencies');
    log.plain(`\n${pc.dim('Detected OS:')} ${osInfo.platform} ${osInfo.arch}${osInfo.isWSL ? ' (WSL)' : ''}`);
    
    for (const dep of missingDeps) {
      log.plain(`\n${pc.yellow(dep.name)} ${pc.dim(`(required for ${dep.requiredFor})`)}`);
      
      const instructions = getInstallInstructions(dep.name, osInfo);
      if (instructions.length > 0) {
        log.plain(pc.dim('   Installation options:'));
        instructions.forEach(instruction => { log.plain(instruction); });
      } else {
        log.plain(`   ${pc.dim('Instructions:')} ${dep.installMsg}`);
      }
    }
    
    log.plain(`\n${pc.dim('After installing dependencies, run Harbor again.')}`);
    throw new Error('Please install missing dependencies before continuing');
  }
}

type DevService = {
  name: string;
  path: string;
  command?: string;
  log?: boolean;
  maxLogLines?: number;
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

type ConfigLocation = 'package.json' | 'harbor.json';

function promptConfigLocation(): Promise<ConfigLocation> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    log.plain(`\n${pc.bold('Found package.json.')} Where would you like to store harbor config?`);
    log.plain(`  ${pc.cyan('1.')} package.json ${pc.dim('(keeps everything in one place)')}`);
    log.plain(`  ${pc.cyan('2.')} harbor.json ${pc.dim('(separate config file, auto-IntelliSense)')}\n`);

    const ask = () => {
      rl.question(`Enter choice ${pc.dim('(1 or 2)')}: `, (answer) => {
        const choice = answer.trim();
        if (choice === '1') {
          rl.close();
          resolve('package.json');
        } else if (choice === '2') {
          rl.close();
          resolve('harbor.json');
        } else {
          log.warn('Please enter 1 or 2');
          ask();
        }
      });
    };

    ask();
  });
}

const possibleProjectFiles = [
  'package.json',     // Node.js projects
  'go.mod',           // Go projects
  'Cargo.toml',       // Rust projects
  'composer.json',    // PHP projects
  'requirements.txt', // Python projects
  'Gemfile',          // Ruby projects
  'pom.xml',          // Java Maven projects
  'build.gradle',     // Java Gradle projects
];

const program = new Command();

// Custom help formatting
function showCustomHelp() {
  const dim = pc.dim;
  const bold = pc.bold;
  const cyan = pc.cyan;
  const yellow = pc.yellow;
  const green = pc.green;
  
  console.log(`
${bold('⚓ Harbor')} ${dim(`v${packageJson.version}`)}
${dim('Orchestrate local dev services in tmux')}

${yellow('Usage:')}
  ${dim('$')} harbor ${cyan('<command>')} ${dim('[options]')}

${yellow('Commands:')}
  ${green('dock')}       Scan directories and create harbor.json config
  ${green('moor')}       Add new services to existing config
  ${green('launch')}     Start all services in tmux ${dim('(-d for headless)')}
  ${green('anchor')}     Attach to a running Harbor session
  ${green('scuttle')}    Stop all services
  ${green('bearings')}   Show status of running services

${yellow('Quick Start:')}
  ${dim('$')} harbor dock            ${dim('# Create config')}
  ${dim('$')} harbor launch          ${dim('# Start services')}
  ${dim('$')} harbor launch -d       ${dim('# Start headless')}

${yellow('Options:')}
  ${cyan('-V, --version')}   Show version
  ${cyan('-h, --help')}      Show help for command

${dim('Run')} harbor ${cyan('<command>')} --help ${dim('for detailed command info')}
`);
}

program
  .name('harbor')
  .description('Orchestrate local dev services in tmux')
  .version(packageJson.version)
  .action(async () => await checkDependencies())
  .addHelpCommand(false)
  .configureHelp({
    sortSubcommands: false,
    sortOptions: false,
  });

// Override help display
program.helpInformation = () => '';
program.on('--help', () => {});

// If no command is provided, display custom help
if (process.argv.length <= 2) {
  showCustomHelp();
  process.exit(0);
}

// Handle -h and --help for main command
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  if (process.argv.length === 3) {
    showCustomHelp();
    process.exit(0);
  }
}

program.command('dock')
  .description('Scan directories and create harbor.json config')
  .option('-p, --path <path>', 'Directory to scan for service projects', './')
  .action(async (options) => {
    try {
      await checkDependencies();
      
      const configExists = checkHasHarborConfig();

      if (configExists) {
        log.error('Harbor project already initialized');
        log.dim('   Configuration already exists');
        log.plain('');
        log.info('To reinitialize, remove the existing configuration first.');
        process.exit(1);
      }

      await generateDevFile(options.path);
      log.plain('');
      log.success(pc.green('Environment prepared!'));
    } catch (err) {
      log.error(err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('moor')
  .description('Add new services to existing config')
  .option('-p, --path <path>', 'Directory to scan for new service projects', './')
  .action(async (options) => {
    try {
      await checkDependencies();
      
      if (!checkHasHarborConfig()) {
        log.error('No harbor configuration found');
        log.plain('');
        log.info('To initialize a new Harbor project:');
        log.cmd('harbor dock');
        process.exit(1);
      }
      
      await generateDevFile(options.path);
    } catch (err) {
      log.error(err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('launch')
  .description('Start all services in tmux (-d for headless)')
  .option('-d, --detach', 'Run in background (headless mode)')
  .option('--headless', 'Alias for --detach')
  .option('--name <name>', 'Override tmux session name')
  .action(async (options) => {
    try {
      const isDetached = options.detach || options.headless;
      
      // Check if already inside a tmux session (only matters for attached mode)
      if (!isDetached && process.env.TMUX) {
        log.error('Cannot launch in attached mode from inside a tmux session');
        log.plain('');
        log.info('Options:');
        log.plain(`   ${pc.cyan('1.')} Use headless mode: ${pc.cyan('harbor launch -d')}`);
        log.plain(`   ${pc.cyan('2.')} Detach from current session ${pc.dim('(Ctrl+b then d)')} and try again`);
        process.exit(1);
      }
      
      await checkDependencies();
      await runServices({ detach: isDetached, name: options.name });
    } catch (err) {
      log.error(err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('anchor')
  .description('Attach to a running Harbor session')
  .option('--name <name>', 'Session name to attach to')
  .action(async (options) => {
    try {
      // Check if already inside a tmux session
      if (process.env.TMUX) {
        log.error('Cannot anchor from inside a tmux session');
        log.plain('');
        log.info('You are already inside a tmux session. To attach:');
        log.plain(`   ${pc.cyan('1.')} Detach from current session ${pc.dim('(Ctrl+b then d)')}`);
        log.plain(`   ${pc.cyan('2.')} Run ${pc.cyan('harbor anchor')} from a regular terminal`);
        process.exit(1);
      }
      
      const config = await readHarborConfig();
      const sessionName = options.name || config.sessionName || 'harbor';
      const socketName = `harbor-${sessionName}`;
      
      // Check if session exists
      const checkSession = spawn('tmux', ['-L', socketName, 'has-session', '-t', sessionName], {
        stdio: 'pipe',
      });
      
      await new Promise<void>((resolve) => {
        checkSession.on('close', (code) => {
          if (code !== 0) {
            log.error(`No running Harbor session found ${pc.dim(`(looking for: ${sessionName})`)}`);
            log.plain('');
            log.info('To start services:');
            log.cmd('harbor launch');
            process.exit(1);
          }
          resolve();
        });
      });
      
      // Attach to the session
      const attach = spawn('tmux', ['-L', socketName, 'attach-session', '-t', sessionName], {
        stdio: 'inherit',
      });
      
      attach.on('close', async (code) => {
        // Check if session was killed (vs just detached)
        const checkAfter = spawn('tmux', ['-L', socketName, 'has-session', '-t', sessionName], {
          stdio: 'pipe',
        });
        
        const sessionStillExists = await new Promise<boolean>((resolve) => {
          checkAfter.on('close', (checkCode) => {
            resolve(checkCode === 0);
          });
        });
        
        // If session no longer exists, it was killed - run after scripts
        if (!sessionStillExists && config.after && config.after.length > 0) {
          try {
            await execute(config.after, 'after');
          } catch {
            log.error('After scripts failed');
            process.exit(1);
          }
        }
        
        process.exit(code || 0);
      });
    } catch (err) {
      log.error(err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('scuttle')
  .description('Stop all services and kill the session')
  .option('--name <name>', 'Session name to stop')
  .action(async (options) => {
    try {
      const config = await readHarborConfig();
      const sessionName = options.name || config.sessionName || 'harbor';
      const socketName = `harbor-${sessionName}`;
      
      // Check if session exists
      const checkSession = spawn('tmux', ['-L', socketName, 'has-session', '-t', sessionName], {
        stdio: 'pipe',
      });
      
      const sessionExists = await new Promise<boolean>((resolve) => {
        checkSession.on('close', (code) => {
          resolve(code === 0);
        });
      });
      
      if (!sessionExists) {
        log.info(`No running Harbor session found ${pc.dim(`(looking for: ${sessionName})`)}`);
        process.exit(0);
      }
      
      // Kill the session
      const killSession = spawn('tmux', ['-L', socketName, 'kill-session', '-t', sessionName], {
        stdio: 'inherit',
      });
      
      killSession.on('close', async (code) => {
        if (code === 0) {
          log.success(`Harbor session ${pc.cyan(sessionName)} stopped`);
          
          // Execute after scripts when session is killed
          if (config.after && config.after.length > 0) {
            try {
              await execute(config.after, 'after');
            } catch {
              log.error('After scripts failed');
              process.exit(1);
            }
          }
        } else {
          log.error('Failed to stop Harbor session');
        }
        process.exit(code || 0);
      });
    } catch (err) {
      log.error(err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('bearings')
  .description('Show status of running services')
  .option('--name <name>', 'Session name to check')
  .action(async (options) => {
    try {
      const config = await readHarborConfig();
      const sessionName = options.name || config.sessionName || 'harbor';
      const socketName = `harbor-${sessionName}`;
      
      // Check if session exists
      const checkSession = spawn('tmux', ['-L', socketName, 'has-session', '-t', sessionName], {
        stdio: 'pipe',
      });
      
      const sessionExists = await new Promise<boolean>((resolve) => {
        checkSession.on('close', (code) => {
          resolve(code === 0);
        });
      });
      
      if (!sessionExists) {
        log.header(`${pc.cyan('⚓')} Harbor Status`);
        log.plain('');
        log.label('Session:', sessionName);
        log.label('Status:', pc.yellow('Not running'));
        log.plain('');
        log.info('To start services:');
        log.cmd(`harbor launch         ${pc.dim('# interactive mode')}`);
        log.cmd(`harbor launch -d      ${pc.dim('# headless mode')}`);
        log.plain('');
        process.exit(0);
      }
      
      // Get list of windows (services)
      const listWindows = spawn('tmux', ['-L', socketName, 'list-windows', '-t', sessionName, '-F', '#{window_index}|#{window_name}|#{pane_current_command}'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let windowOutput = '';
      listWindows.stdout.on('data', (data) => {
        windowOutput += data.toString();
      });
      
      await new Promise<void>((resolve) => {
        listWindows.on('close', () => resolve());
      });
      
      const windows = windowOutput.trim().split('\n').filter(Boolean);
      
      log.header(`${pc.cyan('⚓')} Harbor Status`);
      log.plain('');
      log.label('Session:', sessionName);
      log.label('Status:', pc.green('Running ✓'));
      log.label('Windows:', String(windows.length));
      log.plain('');
      
      log.plain(`   ${pc.dim('Services:')}`);
      for (const window of windows) {
        const [index, name] = window.split('|');
        const logFile = `.harbor/${sessionName}-${name}.log`;
        const hasLog = fs.existsSync(path.join(process.cwd(), logFile));
        const logIndicator = hasLog ? pc.dim(' 📄') : '';
        log.plain(`     ${pc.dim(`[${index}]`)} ${pc.cyan(name)}${logIndicator}`);
      }
      
      // Check for log files
      const harborDir = path.join(process.cwd(), '.harbor');
      if (fs.existsSync(harborDir)) {
        const logFiles = fs.readdirSync(harborDir).filter(f => f.endsWith('.log'));
        if (logFiles.length > 0) {
          log.plain('');
          log.plain(`   ${pc.dim('Logs:')}`);
          for (const logFile of logFiles) {
            const logPath = path.join(harborDir, logFile);
            const stats = fs.statSync(logPath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            log.plain(`     ${pc.dim(`.harbor/${logFile}`)} ${pc.dim(`(${sizeKB} KB)`)}`);
          }
        }
      }
      
      log.plain('');
      log.plain(`   ${pc.dim('Commands:')}`);
      log.plain(`     ${pc.cyan('harbor anchor')}   ${pc.dim('Attach to the session')}`);
      log.plain(`     ${pc.cyan('harbor scuttle')}  ${pc.dim('Stop all services')}`);
      log.plain('');
      
    } catch (err) {
      log.error(err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

function fileExists(path: string) {
  return fs.existsSync(`${process.cwd()}/${path}`);
}

export function isProjectDirectory(dirPath: string): boolean {
  return possibleProjectFiles.some(file => {
    try {
      return fs.existsSync(path.join(process.cwd(), dirPath, file));
    } catch {
      return false;
    }
  });
}

export function validateConfig(config: Config): string | null {
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

async function generateDevFile(dirPath: string): Promise<boolean> {
  let config: Config;
  let writeToPackageJson = false;
  
  try {
    // First try to read from harbor.json
    try {
      const existing = await fs.promises.readFile('harbor.json', 'utf-8');
      config = JSON.parse(existing);
      log.info('Found existing harbor.json, scanning for new services...');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Error reading harbor.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // If harbor.json doesn't exist, try package.json
      try {
        const packageData = await fs.promises.readFile('package.json', 'utf-8');
        const packageJson = JSON.parse(packageData);
        
        if (packageJson.harbor) {
          // Existing harbor config in package.json, use it
          config = packageJson.harbor;
          writeToPackageJson = true;
          log.info('Found existing harbor config in package.json, scanning for new services...');
        } else {
          // package.json exists but no harbor config - ask user where to store it
          const choice = await promptConfigLocation();
          writeToPackageJson = choice === 'package.json';
          config = {
            services: [],
            before: [],
            after: [],
          };
          log.step(`Creating new harbor config in ${pc.cyan(choice)}...`);
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw new Error(`Error reading package.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        // No package.json, create harbor.json
        config = {
          services: [],
        };
        log.step(`Creating new ${pc.cyan('harbor.json')}...`);
      }
    }

    // Create a map of existing services for easy lookup
    const existing = new Set(config.services.map(s => s.name));
    let newServicesAdded = false;

    const folders = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const folderPath = path.join(dirPath, folder.name);
        
        // Only add directories that contain project files and aren't already in config
        if (isProjectDirectory(folderPath) && !existing.has(folder.name)) {
          const service: DevService = {
            name: folder.name,
            path: folderPath,
          };

          // Try to determine default command based on project type
          if (fs.existsSync(path.join(folderPath, 'package.json'))) {
            service.command = 'npm run dev';
          } else if (fs.existsSync(path.join(folderPath, 'go.mod'))) {
            service.command = 'go run .';
          }

          config.services.push(service);
          log.success(`Added service: ${pc.green(folder.name)}`);
          newServicesAdded = true;
        } else if (existing.has(folder.name)) {
          log.dim(`  Skipping existing service: ${folder.name}`);
        } else {
          log.dim(`  Skipping directory ${folder.name} (no recognized project files)`);
        }
      }
    }

    if (!newServicesAdded) {
      log.info('No new services found to add, feel free to add them manually');
    }

    const validationError = validateConfig(config);
    if (validationError) {
      throw new Error(`Invalid harbor configuration: ${validationError}`);
    }

    if (writeToPackageJson) {
      // Update package.json
      const packageData = await fs.promises.readFile('package.json', 'utf-8');
      const packageJson = JSON.parse(packageData);
      packageJson.harbor = config;
      await fs.promises.writeFile(
        'package.json',
        JSON.stringify(packageJson, null, 2),
        'utf-8'
      );
      log.success(`${pc.cyan('package.json')} updated with harbor configuration`);
      log.plain('');
      log.info(`${pc.dim('Tip:')} To enable IntelliSense, add this to ${pc.cyan('.vscode/settings.json')}:`);
      log.plain(pc.dim('   {'));
      log.plain(pc.dim('     "json.schemas": [{'));
      log.plain(pc.dim('       "fileMatch": ["package.json"],'));
      log.plain(pc.dim('       "url": "https://raw.githubusercontent.com/Abyrd9/harbor-cli/main/harbor.package-json.schema.json"'));
      log.plain(pc.dim('     }]'));
      log.plain(pc.dim('   }'));
    } else {
      // Write to harbor.json with $schema for IntelliSense
      const configWithSchema = {
        $schema: 'https://raw.githubusercontent.com/Abyrd9/harbor-cli/main/harbor.schema.json',
        ...config,
      };
      await fs.promises.writeFile(
        'harbor.json',
        JSON.stringify(configWithSchema, null, 2),
        'utf-8'
      );
      log.success(`${pc.cyan('harbor.json')} created successfully`);
    }

    log.plain('');
    log.info(`${pc.dim('Important:')} Verify the auto-detected commands are correct for your services`);
    return true;
  } catch (err) {
    throw new Error(`Error processing directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

async function readHarborConfig(): Promise<Config> {
  // First try to read from harbor.json
  try {
    const data = await fs.promises.readFile('harbor.json', 'utf-8');
    const config = JSON.parse(data) as Config;
    const validationError = validateConfig(config);
    if (validationError) {
      throw new Error(`Invalid configuration in harbor.json: ${validationError}`);
    }
    return config;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  // If harbor.json doesn't exist, try package.json
  try {
    const packageData = await fs.promises.readFile('package.json', 'utf-8');
    const packageJson = JSON.parse(packageData);
    
    if (packageJson.harbor) {
      const config = packageJson.harbor as Config;
      const validationError = validateConfig(config);
      if (validationError) {
        throw new Error(`Invalid configuration in package.json harbor field: ${validationError}`);
      }
      return config;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  throw new Error('No harbor configuration found in harbor.json or package.json');
}

async function execute(scripts: Script[], scriptType: string): Promise<void> {
  if (!scripts || scripts.length === 0) {
    return;
  }

  log.header(`Running ${scriptType} scripts...`);

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    log.plain('');
    log.step(`${pc.dim(`[${i + 1}/${scripts.length}]`)} ${pc.cyan(script.command)}`);
    log.dim(`   in ${script.path}`);

    try {
      await new Promise((resolve, reject) => {
        const process = spawn('sh', ['-c', `cd "${script.path}" && ${script.command}`], {
          stdio: 'inherit',
        });

        process.on('close', (code) => {
          if (code === 0) {
            log.success(`${scriptType} script ${i + 1} completed`);
            resolve(null);
          } else {
            reject(new Error(`${scriptType} script ${i + 1} exited with code ${code}`));
          }
        });

        process.on('error', (err) => {
          reject(new Error(`${scriptType} script ${i + 1} failed: ${err.message}`));
        });
      });
    } catch (err) {
      log.error(`Error executing ${scriptType} script ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  }

  log.plain('');
  log.success(`All ${scriptType} scripts completed`);
}

interface RunServicesOptions {
  detach?: boolean;
  name?: string;
}

async function runServices(options: RunServicesOptions = {}): Promise<void> {
  const hasHarborConfig = checkHasHarborConfig();

  if (!hasHarborConfig) {
    log.error('No harbor configuration found');
    log.plain('');
    log.info('To initialize a new Harbor project:');
    log.cmd('harbor dock');
    process.exit(1);
  }

  // Load and validate config
  let config: Config;
  try {
    config = await readHarborConfig();
    const validationError = validateConfig(config);
    if (validationError) {
      log.error(`Invalid harbor.json configuration: ${validationError}`);
      process.exit(1);
    }
  } catch (err) {
    log.error(`Error reading config: ${err}`);
    process.exit(1);
  }

  ensureLogSetup(config);

  // Execute before scripts
  try {
    await execute(config.before || [], 'before');
  } catch {
    log.error('Before scripts failed, aborting launch');
    process.exit(1);
  }

  // Ensure scripts exist and are executable
  await ensureScriptsExist();

  // Execute the script directly using spawn to handle I/O streams
  const scriptPath = path.join(getScriptsDir(), 'dev.sh');
  const env = {
    ...process.env,
    HARBOR_DETACH: options.detach ? '1' : '0',
    HARBOR_SESSION_NAME: options.name || '',
  };
  
  const command = spawn('bash', [scriptPath], {
    stdio: 'inherit', // This will pipe stdin/stdout/stderr to the parent process
    env,
  });

  return new Promise((resolve) => {
    command.on('error', (err) => {
      log.error(`Error running dev.sh: ${err}`);
      process.exit(1);
    });

    command.on('close', async (code) => {
      if (code !== 0) {
        log.error(`dev.sh exited with code ${code}`);
        process.exit(1);
      }

      // Only execute after scripts in attached mode
      // In headless mode, after scripts are run by 'scuttle' when session is killed
      if (!options.detach) {
        try {
          await execute(config.after || [], 'after');
        } catch {
          log.error('After scripts failed');
          process.exit(1);
        }
      }
      resolve();
    });
  });
}

function ensureLogSetup(config: Config): void {
  const shouldLog = config.services.some((service) => service.log);
  if (!shouldLog) {
    return;
  }

  const harborDir = path.join(process.cwd(), '.harbor');
  if (!fs.existsSync(harborDir)) {
    fs.mkdirSync(harborDir, { recursive: true });
  }

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return;
  }

  const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  if (gitignore.includes('.harbor')) {
    return;
  }

  const needsNewline = gitignore.length > 0 && !gitignore.endsWith('\n');
  const entry = `${needsNewline ? '\n' : ''}.harbor/\n`;
  fs.appendFileSync(gitignorePath, entry, 'utf-8');
}

// Get the package root directory
function getPackageRoot(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..');
}

// Get the template scripts directory (where our source scripts live)
function getTemplateScriptsDir(): string {
  return path.join(getPackageRoot(), 'scripts');
}

// Get the scripts directory (where we'll create the scripts for the user)
function getScriptsDir(): string {
  return path.join(getPackageRoot(), 'scripts');
}

async function ensureScriptsExist(): Promise<void> {
  const scriptsDir = getScriptsDir();
  const templateDir = getTemplateScriptsDir();
  
  // Ensure scripts directory exists
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  try {
    const scriptPath = path.join(scriptsDir, 'dev.sh');
    const templatePath = path.join(templateDir, 'dev.sh');

    // Create the script if it doesn't exist
    if (!fs.existsSync(scriptPath)) {
      const templateContent = readFileSync(templatePath, 'utf-8');
      fs.writeFileSync(scriptPath, templateContent, 'utf-8');
      console.log('Created dev.sh');
    }
    // Make the script executable
    chmodSync(scriptPath, '755');
  } catch (err) {
    console.error('Error setting up dev.sh:', err);
    throw err;
  }
}

function checkHasHarborConfig(): boolean {
  // Check for harbor.json
  if (fileExists('harbor.json')) {
    return true;
  }

  // Check for harbor config in package.json
  try {
    const packageData = fs.readFileSync(`${process.cwd()}/package.json`, 'utf-8');
    const packageJson = JSON.parse(packageData);
    return !!packageJson.harbor;
  } catch {
    return false;
  }
}
