# Harbor CLI

A CLI tool for managing local development services with ease. Harbor helps you orchestrate multiple development services in tmux sessions, perfect for microservices and polyglot projects.

## ✨ Features

- 🛠️ **Automatic Service Discovery**: Detects project types and suggests appropriate commands
- 📁 **Flexible Configuration**: Store config in `harbor.json` or `package.json`
- 🚀 **One-Command Launch**: Start all services with a single command
- 🔄 **Dependency Management**: Automatically checks for required system dependencies
- 🎯 **Multi-Language Support**: Works with Node.js, Go, Rust, Python, PHP, Java, and more
- 🖥️ **Tmux Integration**: Professional terminal multiplexing for service management

## Installation

```bash
npm install -g @abyrd9/harbor-cli
```

## Prerequisites

Harbor automatically checks for these required dependencies:

- **[tmux](https://github.com/tmux/tmux/wiki/Installing)** - Terminal multiplexer for managing services
- **[jq](https://stedolan.github.io/jq/download/)** - JSON processor for service management

If missing, Harbor will provide installation instructions.

## Quick Start

1. **Initialize your project**:
   ```bash
   harbor dock
   ```
   This scans your directory structure and creates a harbor configuration.

2. **Add more services** (optional):
   ```bash
   harbor moor
   ```
   Scans for new services and adds them to your configuration.

3. **Launch all services**:
   ```bash
   harbor launch
   ```
   Starts all configured services in organized tmux windows.

## Configuration

Harbor supports two configuration formats:

### Option 1: harbor.json

Create a dedicated configuration file:

```json
{
  "services": [
    {
      "name": "frontend",
      "path": "./vite-frontend",
      "command": "npm run dev"
    },
    {
      "name": "api",
      "path": "./go-api",
      "command": "go run ."
    },
    {
      "name": "database",
      "path": "./db",
      "command": "docker-compose up"
    }
  ],
  "before": [
    {
      "path": "./",
      "command": "echo 'Starting development environment...' && docker-compose up -d"
    },
    {
      "path": "./scripts",
      "command": "./setup-dev.sh"
    }
  ],
  "after": [
    {
      "path": "./",
      "command": "echo 'Development environment ready!'"
    }
  ]
}
```

### Option 2: package.json

Store configuration directly in your `package.json`:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "harbor": {
    "services": [
      {
        "name": "frontend",
        "path": "./frontend",
        "command": "npm run dev"
      },
      {
        "name": "api",
        "path": "./api",
        "command": "go run main.go"
      }
    ],
    "before": [
      {
        "path": "./",
        "command": "docker-compose up -d database"
      }
    ],
    "after": [
      {
        "path": "./",
        "command": "echo 'All services are running!'"
      }
    ]
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `harbor dock` | Initialize harbor configuration by scanning project directories |
| `harbor moor` | Scan for and add new services to existing configuration |
| `harbor launch` | Start all services in tmux sessions |
| `harbor --help` | Show help and available commands |
| `harbor --version` | Show version information |

### Command Options

- `-p, --path <path>`: Specify project root path (defaults to `./`)

## Supported Project Types

Harbor automatically detects and configures services for:

- **Node.js**: `package.json` → `npm run dev`
- **Go**: `go.mod` → `go run .`
- **Rust**: `Cargo.toml` → `cargo run`
- **Python**: `requirements.txt` → `python app.py`
- **PHP**: `composer.json` → `php artisan serve`
- **Java**: `pom.xml`/`build.gradle` → `mvn spring-boot:run` or `./gradlew bootRun`

## How It Works

1. **Service Discovery**: Harbor scans your directory for folders containing project files
2. **Command Detection**: Based on project type, suggests appropriate development commands
3. **Configuration Generation**: Creates/updates harbor config with discovered services
4. **Tmux Session**: Launches each service in its own tmux window with proper working directories
5. **Process Management**: All services run independently with proper I/O handling

## Terminal Multiplexer (Tmux)

Harbor uses tmux for professional service management. Essential shortcuts:

### Session Management
- `Ctrl+a d` - Detach from session (services continue running)
- `Ctrl+a :attach` - Reattach to session
- `Ctrl+a &` - Kill current window
- `Ctrl+a ?` - Show all keybindings

### Window Navigation
- `Ctrl+a c` - Create new window
- `Ctrl+a n` - Next window
- `Ctrl+a p` - Previous window
- `Ctrl+a 0-9` - Jump to window number
- `Ctrl+a w` - List all windows

### Pane Management
- `Ctrl+a %` - Split window vertically
- `Ctrl+a "` - Split window horizontally
- `Ctrl+a →/←/↑/↓` - Navigate between panes
- `Ctrl+a x` - Close current pane

## Advanced Usage

### Custom Commands
Override auto-detected commands by editing your configuration:

```json
{
  "services": [
    {
      "name": "custom-service",
      "path": "./my-service",
      "command": "custom-command --with-flags"
    }
  ]
}
```

### Before/After Scripts
Run custom scripts before and after your services start:

```json
{
  "before": [
    {
      "path": "./infrastructure",
      "command": "docker-compose up -d"
    },
    {
      "path": "./",
      "command": "npm run setup:dev"
    }
  ],
  "after": [
    {
      "path": "./",
      "command": "npm run seed:database"
    },
    {
      "path": "./scripts",
      "command": "./notify-dev-ready.sh"
    }
  ]
}
```

**Execution Flow:**
1. **Before scripts** run sequentially before services start
2. Services launch in tmux windows
3. **After scripts** run sequentially after services are ready

**Use Cases:**
- Set up databases or infrastructure
- Run database migrations or seeds
- Send notifications when environment is ready
- Clean up temporary files
- Run integration tests

### Selective Launch
Currently launches all services. Future versions may support selective service launching.

### Environment Variables
Services inherit your shell environment. Use `.env` files or export variables before running `harbor launch`.

## Troubleshooting

### Common Issues

1. **"Missing required dependencies"**
   - Install tmux and jq as indicated in the error message

2. **"No harbor configuration found"**
   - Run `harbor dock` to initialize configuration
   - Ensure you're in the correct project directory

3. **Services not starting**
   - Check that commands are correct in your harbor configuration
   - Verify project dependencies are installed in each service directory
   - Check tmux windows for error messages

4. **Tmux not responding**
   - Try `tmux kill-session -t harbor` to clean up
   - Restart with `harbor launch`

## Examples

### Monorepo Setup
```
my-project/
├── frontend/     (package.json)
├── backend/      (go.mod)
├── database/     (docker-compose.yml)
└── harbor.json
```

### Polyglot Microservices
```
services/
├── auth-service/     (Node.js)
├── user-service/     (Go)
├── payment-service/  (Python)
└── notification-service/ (Rust)
```

## Contributing

Contributions are welcome! Please feel free to:

- Report bugs and request features via GitHub Issues
- Submit pull requests for improvements
- Help improve documentation

## License

MIT - See LICENSE file for details
