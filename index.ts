#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

const requiredDependencies: Dependency[] = [
  {
    name: 'Caddy',
    command: 'caddy version',
    installMsg: 'https://caddyserver.com/docs/install',
    requiredFor: 'reverse proxy functionality',
  },
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

async function checkDependencies(): Promise<void> {
  const missingDeps: Dependency[] = [];

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
    for (const dep of missingDeps) {
      console.log(`\n${dep.name} (required for ${dep.requiredFor})`);
      console.log(`Install instructions: ${dep.installMsg}`);
    }
    throw new Error('Please install missing dependencies before continuing');
  }
}

type DevService = {
  name: string;
  path: string;
  subdomain?: string;
  command?: string;
  port?: number;
}

type Config = {
  domain: string;
  useSudo: boolean;
  services: DevService[];
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
It provides a simple way to configure and run your services with automatic
subdomain routing through Caddy reverse proxy.

Available Commands:
  dock      Initialize a new Harbor project
  moor      Add new services to your configuration
  anchor    Generate Caddy reverse proxy configuration
  launch    Start all services in tmux sessions`)
  .version(packageJson.version)
  .action(async () => await checkDependencies())
  .addHelpCommand(false);

// If no command is provided, display help
if (process.argv.length <= 2) {
  program.help();
}

program.command('dock')
  .description(`Prepares your development environment by creating both:
- harbor.json configuration file (or harbor field in package.json)
- Caddyfile for reverse proxy (if needed)
	
This is typically the first command you'll run in a new project.`)
  .option('-p, --path <path>', 'The path to the root of your project', './')
  .action(async (options) => {
    try {
      const caddyFileExists = fileExists('Caddyfile');
      const configExists = checkHasHarborConfig();

      if (caddyFileExists || configExists) {
        console.log('❌ Error: Harbor project already initialized');
        if (caddyFileExists) {
          console.log('   - Caddyfile already exists');
        }
        if (configExists) {
          console.log('   - Harbor configuration already exists');
        }
        console.log('\nTo reinitialize, please remove these files first.');
        process.exit(1);
      }

      const servicesAdded = await generateDevFile(options.path);
      
      // Only try to generate Caddyfile if services were actually added
      if (servicesAdded) {
        try {
          await generateCaddyFile();
          console.log('✨ Environment successfully prepared and anchored!');
        } catch (err) {
          if (err instanceof Error && err.message.includes('No harbor configuration found')) {
            // This is expected if no services were added
            console.log('✨ Environment prepared! No services configured yet.');
          } else {
            console.log('❌ Error generating Caddyfile:', err instanceof Error ? err.message : 'Unknown error');
            process.exit(1);
          }
        }
      } else {
        console.log('✨ Environment prepared! No services configured yet.');
      }
    } catch (err) {
      console.log('❌ Error:', err instanceof Error ? err.message : 'Unknown error');
      process.exit(1);
    }
  });

program.command('moor')
  .description('Add new services to your harbor configuration')
  .option('-p, --path <path>', 'The path to the root of your project', './')
  .action(async (options) => {
    if (!checkHasHarborConfig()) {
      console.log('❌ No harbor configuration found');
      console.log('\nTo initialize a new Harbor project, please use:');
      console.log('  harbor dock');
      process.exit(1);
    }
    
    await generateDevFile(options.path);
  });

program.command('anchor')
  .description(`Add new services to your Caddyfile

Note: This command will stop any active Caddy processes, including those from other Harbor projects.`)
  .action(async () => {
    if (!checkHasHarborConfig()) {
      console.log('❌ No harbor configuration found');
      console.log('\nTo initialize a new Harbor project, please use:');
      console.log('  harbor dock');
      process.exit(1);
    }

    await generateCaddyFile();
  });

program.command('launch')
  .description(`Launch your services in the harbor terminal multiplexer (Using tmux)

Note: This command will stop any active Caddy processes, including those from other Harbor projects.`)
  .action(async () => {
    await runServices();
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
  if (!config.domain) {
    return 'Domain is required';
  }

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
            domain: 'localhost',
            useSudo: false,
            services: [],
          };
          console.log('Creating new harbor config in package.json...');
        } else {
          // No package.json, create harbor.json
          config = {
            domain: 'localhost',
            useSudo: false,
            services: [],
          };
          console.log('Creating new harbor.json...');
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw new Error(`Error reading package.json: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        // No package.json, create harbor.json
        config = {
          domain: 'localhost',
          useSudo: false,
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
            subdomain: folder.name.toLowerCase().replace(/\s+/g, ''),
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
      // Still write the initial config even if no services were found
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
      return false;
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
    console.log('  - Update the \'Port\' field for each service to match its actual port or leave blank to ignore in the Caddyfile');
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

async function stopCaddy(): Promise<void> {
  try {
    console.log('\n⚠️  Stopping any existing Caddy processes...');
    console.log('   This will interrupt any active Harbor or Caddy services\n');
    
    // Try to kill any existing Caddy processes
    await new Promise<void>((resolve) => {
      const isWindows = process.platform === 'win32';
      const killCommand = isWindows ? 'taskkill /F /IM caddy.exe' : 'pkill caddy';
      
      const childProcess = spawn('sh', ['-c', killCommand]);
      childProcess.on('close', () => {
        // It's okay if there was no process to kill (code 1)
        resolve();
      });
    });
    
    // Give it a moment to fully release ports
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    // Ignore errors as the process might not exist
  }
}

async function generateCaddyFile(): Promise<void> {
  try {
    const config = await readHarborConfig();
    let caddyfileContent = '';

    // Check if any services need a Caddyfile
    const needsCaddyfile = config.services.some(svc => svc.port && svc.subdomain);
    
    if (!needsCaddyfile) {
      // If no services need a Caddyfile, remove it if it exists
      if (fileExists('Caddyfile')) {
        await fs.promises.unlink('Caddyfile');
        console.log('Removed Caddyfile as no services require subdomains');
      }
      return;
    }

    for (const svc of config.services) {
      if (!svc.port || !svc.subdomain) {
        continue;
      }

      const serverName = `${svc.subdomain}.${config.domain}`;
      caddyfileContent += `${serverName} {\n`;
      caddyfileContent += `  reverse_proxy localhost:${svc.port}\n`;
      caddyfileContent += "}\n\n";
    }

    await fs.promises.writeFile('Caddyfile', caddyfileContent, 'utf-8');
    
    // Stop existing Caddy process before proceeding
    await stopCaddy();
    
    console.log('Caddyfile generated successfully');
  } catch (err) {
    console.error('Error generating Caddyfile:', err);
    process.exit(1);
  }
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

  // Check if any services need a Caddyfile
  const needsCaddyfile = config.services.some(svc => svc.port && svc.subdomain);

  if (needsCaddyfile && !fileExists('Caddyfile')) {
    console.log('❌ No Caddyfile found, but some services require subdomains');
    console.log('\nTo generate the Caddyfile:');
    console.log('  harbor anchor');
    process.exit(1);
  }

  // Stop any existing Caddy process if we need it
  if (needsCaddyfile) {
    await stopCaddy();
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

    command.on('close', (code) => {
      if (code !== 0) {
        console.error(`dev.sh exited with code ${code}`);
        process.exit(1);
      }
      resolve();
    });
  });
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

