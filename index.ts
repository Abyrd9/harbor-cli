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
    console.log('❌ Missing required dependencies:');
    console.log(`\n🖥️  Detected OS: ${osInfo.platform} ${osInfo.arch}${osInfo.isWSL ? ' (WSL)' : ''}`);
    
    for (const dep of missingDeps) {
      console.log(`\n📦 ${dep.name} (required for ${dep.requiredFor})`);
      
      const instructions = getInstallInstructions(dep.name, osInfo);
      if (instructions.length > 0) {
        console.log('   Installation options:');
        instructions.forEach(instruction => { console.log(instruction); });
      } else {
        console.log(`   General instructions: ${dep.installMsg}`);
      }
    }
    
    console.log('\n💡 After installing the dependencies, run Harbor again.');
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
    console.log('\nFound package.json. Where would you like to store harbor config?');
    console.log('  1. package.json (keeps everything in one place)');
    console.log('  2. harbor.json (separate config file, auto-IntelliSense)\n');

    const ask = () => {
      rl.question('Enter choice (1 or 2): ', (answer) => {
        const choice = answer.trim();
        if (choice === '1') {
          rl.close();
          resolve('package.json');
        } else if (choice === '2') {
          rl.close();
          resolve('harbor.json');
        } else {
          console.log('Please enter 1 or 2');
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

program
  .name('harbor')
  .description(`A CLI tool for orchestrating multiple local development services in tmux.

WHAT IT DOES:
  Harbor manages multiple services (APIs, frontends, databases) in a single tmux 
  session. It auto-discovers projects, starts them together, and provides logging.

REQUIREMENTS:
  - tmux (terminal multiplexer)
  - jq (JSON processor)

TYPICAL WORKFLOW:
  1. harbor dock          # First time: scan and create harbor.json config
  2. harbor launch        # Start all services in interactive tmux session
     harbor launch -d     # Or start in headless/background mode
  3. harbor bearings      # Check status of running services
  4. harbor anchor        # Attach to running session (if headless)
  5. harbor scuttle       # Stop all services when done

CONFIGURATION:
  Config is stored in harbor.json or package.json under "harbor" key.
  Services can specify: name, path, command, log (boolean), maxLogLines.

COMMANDS:
  dock      Create new harbor.json by scanning for projects (package.json, go.mod, etc.)
  moor      Add newly discovered services to existing config
  launch    Start all configured services (use -d/--headless for background mode)
  bearings  Show status: running services, session info, log file locations
  anchor    Attach terminal to a running Harbor tmux session
  scuttle   Stop all services by killing the tmux session`)
  .version(packageJson.version)
  .action(async () => await checkDependencies())
  .addHelpCommand(false);

// If no command is provided, display help
if (process.argv.length <= 2) {
  program.help();
}

program.command('dock')
  .description(`Initialize a new Harbor project by scanning directories for services.

WHEN TO USE: Run this first in a new project that has no harbor.json yet.

WHAT IT DOES:
  - Scans subdirectories for project files (package.json, go.mod, Cargo.toml, etc.)
  - Creates harbor.json with discovered services
  - Auto-detects run commands (npm run dev, go run ., etc.)

PREREQUISITES: No existing harbor.json or harbor config in package.json.

EXAMPLE:
  harbor dock              # Scan current directory
  harbor dock -p ./apps    # Scan specific subdirectory`)
  .option('-p, --path <path>', 'Directory to scan for service projects (scans subdirectories)', './')
  .action(async (options) => {
    try {
      await checkDependencies();
      
      const configExists = checkHasHarborConfig();

      if (configExists) {
        console.log('❌ Error: Harbor project already initialized');
        console.log('   - Harbor configuration already exists');
        console.log('\nTo reinitialize, please remove the configuration first.');
        process.exit(1);
      }

      await generateDevFile(options.path);
      console.log('✨ Environment prepared!');
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('moor')
  .description(`Add newly discovered services to an existing Harbor configuration.

WHEN TO USE: Run when you've added new service directories to your project.

WHAT IT DOES:
  - Scans for new project directories not already in config
  - Adds them to existing harbor.json or package.json harbor config
  - Skips directories already configured

PREREQUISITES: Existing harbor.json or harbor config in package.json (run 'dock' first).

EXAMPLE:
  harbor moor              # Scan and add new services
  harbor moor -p ./apps    # Scan specific subdirectory for new services`)
  .option('-p, --path <path>', 'Directory to scan for new service projects', './')
  .action(async (options) => {
    try {
      await checkDependencies();
      
      if (!checkHasHarborConfig()) {
        console.log('❌ No harbor configuration found');
        console.log('\nTo initialize a new Harbor project, please use:');
        console.log('  harbor dock');
        process.exit(1);
      }
      
      await generateDevFile(options.path);
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('launch')
  .description(`Start all configured services in a tmux session.

WHEN TO USE: Run to start your development environment.

WHAT IT DOES:
  - Kills any existing Harbor tmux session
  - Runs 'before' scripts if configured
  - Creates tmux session with a window per service
  - Starts each service with its configured command
  - Enables logging to .harbor/*.log if log:true in config
  - Runs 'after' scripts when session ends

MODES:
  Interactive (default): Opens tmux session, use Shift+Left/Right to switch tabs
  Headless (-d/--headless): Runs in background, use 'anchor' to attach later

PREREQUISITES: harbor.json or harbor config in package.json.

EXAMPLES:
  harbor launch            # Start and attach to tmux session
  harbor launch -d         # Start in background (headless mode)
  harbor launch --headless # Same as -d
  harbor launch --name my-session # Use custom session name`)
  .option('-d, --detach', 'Run in background without attaching (headless mode). Use "anchor" to attach later.')
  .option('--headless', 'Alias for --detach')
  .option('--name <name>', 'Override tmux session name from config')
  .action(async (options) => {
    try {
      await checkDependencies();
      await runServices({ detach: options.detach || options.headless, name: options.name });
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('anchor')
  .description(`Attach your terminal to a running Harbor tmux session.

WHEN TO USE: After starting services with 'launch -d' (headless mode).

WHAT IT DOES:
  - Checks if a Harbor tmux session is running
  - Attaches your terminal to it
  - You can then switch between service tabs with Shift+Left/Right
  - Press Ctrl+q to kill session, or detach with Ctrl+b then d

PREREQUISITES: Services must be running (started with 'harbor launch').

EXAMPLE:
  harbor launch -d   # Start in background
  harbor anchor      # Attach to see the services`)
  .action(async () => {
    try {
      const config = await readHarborConfig();
      const sessionName = config.sessionName || 'harbor';
      
      // Check if session exists
      const checkSession = spawn('tmux', ['has-session', '-t', sessionName], {
        stdio: 'pipe',
      });
      
      await new Promise<void>((resolve) => {
        checkSession.on('close', (code) => {
          if (code !== 0) {
            console.log(`❌ No running Harbor session found (looking for: ${sessionName})`);
            console.log('\nTo start services, run:');
            console.log('  harbor launch');
            process.exit(1);
          }
          resolve();
        });
      });
      
      // Attach to the session
      const attach = spawn('tmux', ['attach-session', '-t', sessionName], {
        stdio: 'inherit',
      });
      
      attach.on('close', (code) => {
        process.exit(code || 0);
      });
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('scuttle')
  .description(`Stop all running Harbor services by killing the tmux session.

WHEN TO USE: When you want to stop all services and free up resources.

WHAT IT DOES:
  - Finds the running Harbor tmux session
  - Kills the entire session (all service windows)
  - All services stop immediately

SAFE TO RUN: If no session is running, it simply reports that and exits cleanly.

EXAMPLE:
  harbor scuttle   # Stop all services`)
  .action(async () => {
    try {
      const config = await readHarborConfig();
      const sessionName = config.sessionName || 'harbor';
      
      // Check if session exists
      const checkSession = spawn('tmux', ['has-session', '-t', sessionName], {
        stdio: 'pipe',
      });
      
      const sessionExists = await new Promise<boolean>((resolve) => {
        checkSession.on('close', (code) => {
          resolve(code === 0);
        });
      });
      
      if (!sessionExists) {
        console.log(`ℹ️  No running Harbor session found (looking for: ${sessionName})`);
        process.exit(0);
      }
      
      // Kill the session
      const killSession = spawn('tmux', ['kill-session', '-t', sessionName], {
        stdio: 'inherit',
      });
      
      killSession.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Harbor session '${sessionName}' stopped`);
        } else {
          console.log('❌ Failed to stop Harbor session');
        }
        process.exit(code || 0);
      });
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('bearings')
  .description(`Show status of running Harbor services and session information.

WHEN TO USE: To check if services are running, especially in headless mode.

WHAT IT SHOWS:
  - Session name and running status
  - List of service windows (with 📄 indicator if logging enabled)
  - Log file paths and sizes
  - Available commands (anchor, scuttle)

OUTPUT EXAMPLE:
  ⚓ Harbor Status
     Session:  harbor
     Status:   Running ✓
     Services: [0] Terminal, [1] web 📄, [2] api 📄
     Logs:     .harbor/harbor-web.log (1.2 KB)

SAFE TO RUN: Works whether services are running or not.

EXAMPLE:
  harbor bearings   # Check what's running`)
  .action(async () => {
    try {
      const config = await readHarborConfig();
      const sessionName = config.sessionName || 'harbor';
      
      // Check if session exists
      const checkSession = spawn('tmux', ['has-session', '-t', sessionName], {
        stdio: 'pipe',
      });
      
      const sessionExists = await new Promise<boolean>((resolve) => {
        checkSession.on('close', (code) => {
          resolve(code === 0);
        });
      });
      
      if (!sessionExists) {
        console.log(`\n⚓ Harbor Status\n`);
        console.log(`   Session:  ${sessionName}`);
        console.log(`   Status:   Not running\n`);
        console.log(`   To start services, run:`);
        console.log(`     harbor launch         # interactive mode`);
        console.log(`     harbor launch -d      # headless mode\n`);
        process.exit(0);
      }
      
      // Get list of windows (services)
      const listWindows = spawn('tmux', ['list-windows', '-t', sessionName, '-F', '#{window_index}|#{window_name}|#{pane_current_command}'], {
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
      
      console.log(`\n⚓ Harbor Status\n`);
      console.log(`   Session:  ${sessionName}`);
      console.log(`   Status:   Running ✓`);
      console.log(`   Windows:  ${windows.length}\n`);
      
      console.log(`   Services:`);
      for (const window of windows) {
        const [index, name, cmd] = window.split('|');
        const logFile = `.harbor/${sessionName}-${name}.log`;
        const hasLog = fs.existsSync(path.join(process.cwd(), logFile));
        const logIndicator = hasLog ? ` 📄` : '';
        console.log(`     [${index}] ${name}${logIndicator}`);
      }
      
      // Check for log files
      const harborDir = path.join(process.cwd(), '.harbor');
      if (fs.existsSync(harborDir)) {
        const logFiles = fs.readdirSync(harborDir).filter(f => f.endsWith('.log'));
        if (logFiles.length > 0) {
          console.log(`\n   Logs:`);
          for (const logFile of logFiles) {
            const logPath = path.join(harborDir, logFile);
            const stats = fs.statSync(logPath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`     .harbor/${logFile} (${sizeKB} KB)`);
          }
        }
      }
      
      console.log(`\n   Commands:`);
      console.log(`     harbor anchor   - Anchor to the session`);
      console.log(`     harbor scuttle  - Stop all services\n`);
      
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
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
      console.log('Found existing harbor.json, scanning for new services...');
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
          console.log('Found existing harbor config in package.json, scanning for new services...');
        } else {
          // package.json exists but no harbor config - ask user where to store it
          const choice = await promptConfigLocation();
          writeToPackageJson = choice === 'package.json';
          config = {
            services: [],
            before: [],
            after: [],
          };
          console.log(`Creating new harbor config in ${choice}...`);
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw new Error(`Error reading package.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        // No package.json, create harbor.json
        config = {
          services: [],
        };
        console.log('Creating new harbor.json...');
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
          console.log(`Added new service: ${folder.name}`);
          newServicesAdded = true;
        } else if (existing.has(folder.name)) {
          console.log(`Skipping existing service: ${folder.name}`);
        } else {
          console.log(`Skipping directory ${folder.name} (no recognized project files)`);
        }
      }
    }

    if (!newServicesAdded) {
      console.log('No new services found to add, feel free to add them manually');
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
      console.log('\npackage.json updated successfully with harbor configuration');
      console.log('\n💡 Tip: To enable IntelliSense for the harbor config in package.json,');
      console.log('   add this to your .vscode/settings.json:');
      console.log('   {');
      console.log('     "json.schemas": [{');
      console.log('       "fileMatch": ["package.json"],');
      console.log('       "url": "https://raw.githubusercontent.com/Abyrd9/harbor-cli/main/harbor.package-json.schema.json"');
      console.log('     }]');
      console.log('   }');
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
      console.log('\nharbor.json created successfully');
    }

    console.log('\nImportant:');
    console.log('  - Verify the auto-detected commands are correct for your services');
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

  console.log(`\n🚀 Executing ${scriptType} scripts...`);

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    console.log(`\n📋 Running ${scriptType} script ${i + 1}/${scripts.length}: ${script.command}`);
    console.log(`   📁 In directory: ${script.path}`);

    try {
      await new Promise((resolve, reject) => {
        const process = spawn('sh', ['-c', `cd "${script.path}" && ${script.command}`], {
          stdio: 'inherit',
        });

        process.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ ${scriptType} script ${i + 1} completed successfully`);
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
      console.error(`❌ Error executing ${scriptType} script ${i + 1}:`, err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }

  console.log(`\n✅ All ${scriptType} scripts completed successfully`);
}

interface RunServicesOptions {
  detach?: boolean;
  name?: string;
}

async function runServices(options: RunServicesOptions = {}): Promise<void> {
  const hasHarborConfig = checkHasHarborConfig();

  if (!hasHarborConfig) {
    console.log('❌ No harbor configuration found');
    console.log('\nTo initialize a new Harbor project, please use:');
    console.log('  harbor dock');
    process.exit(1);
  }

  // Load and validate config
  let config: Config;
  try {
    config = await readHarborConfig();
    const validationError = validateConfig(config);
    if (validationError) {
      console.log(`❌ Invalid harbor.json configuration: ${validationError}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error reading config:', err);
    process.exit(1);
  }

  ensureLogSetup(config);

  // Execute before scripts
  try {
    await execute(config.before || [], 'before');
  } catch {
    console.error('❌ Before scripts failed, aborting launch');
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
      console.error(`Error running dev.sh: ${err}`);
      process.exit(1);
    });

    command.on('close', async (code) => {
      if (code !== 0) {
        console.error(`dev.sh exited with code ${code}`);
        process.exit(1);
      }

      // Execute after scripts
      try {
        await execute(config.after || [], 'after');
        resolve();
      } catch {
        console.error('❌ After scripts failed');
        process.exit(1);
      }
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
