#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

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
        instructions.forEach(instruction => console.log(instruction));
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
  .description(`A CLI tool for managing your project's local development services

Harbor helps you manage multiple local development services with ease.
It provides a simple way to configure and run your services in tmux sessions.

Available Commands:
  dock      Initialize a new Harbor project
  moor      Add new services to your configuration
  launch    Start all services in tmux sessions`)
  .version(packageJson.version)
  .action(async () => await checkDependencies())
  .addHelpCommand(false);

// If no command is provided, display help
if (process.argv.length <= 2) {
  program.help();
}

program.command('dock')
  .description(`Prepares your development environment by creating a harbor configuration file
- harbor.json configuration file (or harbor field in package.json)
	
This is typically the first command you'll run in a new project.`)
  .option('-p, --path <path>', 'The path to the root of your project', './')
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
  .description('Add new services to your harbor configuration')
  .option('-p, --path <path>', 'The path to the root of your project', './')
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
  .description(`Launch your services in the harbor terminal multiplexer (Using tmux)

Note: This command will stop any active Caddy processes, including those from other Harbor projects.`)
  .action(async () => {
    try {
      await checkDependencies();
      await runServices();
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

function fileExists(path: string) {
  return fs.existsSync(`${process.cwd()}/${path}`);
}

function isProjectDirectory(dirPath: string): boolean {
  return possibleProjectFiles.some(file => {
    try {
      return fs.existsSync(path.join(process.cwd(), dirPath, file));
    } catch {
      return false;
    }
  });
}

function validateConfig(config: Config): string | null {
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
          config = packageJson.harbor;
          writeToPackageJson = true;
          console.log('Found existing harbor config in package.json, scanning for new services...');
        } else if (fileExists('package.json')) {
          // If package.json exists but no harbor config, use it
          writeToPackageJson = true;
          config = {
            services: [],
            before: [],
            after: [],
          };
          console.log('Creating new harbor config in package.json...');
        } else {
          // No package.json, create harbor.json
          config = {
            services: [],
            before: [],
            after: [],
          };
          console.log('Creating new harbor.json...');
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
    } else {
      // Write to harbor.json
      await fs.promises.writeFile(
        'harbor.json',
        JSON.stringify(config, null, 2),
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

async function runServices(): Promise<void> {
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
  } catch (err) {
    console.error('❌ Before scripts failed, aborting launch');
    process.exit(1);
  }

  // Ensure scripts exist and are executable
  await ensureScriptsExist();

  // Execute the script directly using spawn to handle I/O streams
  const scriptPath = path.join(getScriptsDir(), 'dev.sh');
  const command = spawn('bash', [scriptPath], {
    stdio: 'inherit', // This will pipe stdin/stdout/stderr to the parent process
  });

  return new Promise((resolve, reject) => {
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
      } catch (err) {
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
