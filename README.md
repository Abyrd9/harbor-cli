# Harbor CLI

A CLI tool for those small side projects that only run a few services. Harbor allows you to:

1. 🛠️ Define your services in a configuration file
2. 🚀 Launch your services in a tmux session

## Installation

```bash
npm i -g @abyrd9/harbor-cli
```

## Prerequisites

Before using Harbor, make sure you have the following installed:

- [tmux](https://github.com/tmux/tmux/wiki/Installing) (for terminal multiplexing)
- [jq](https://stedolan.github.io/jq/download/) (for JSON processing within tmux)

## Quick Start

1. Initialize your development environment:
```bash
harbor dock
```

2. Add new services to your configuration:
```bash
harbor moor
```

3. Launch your services:
```bash
harbor launch
```

## Configuration

Harbor uses a configuration file to manage your services:

### harbor.json

Contains your service configurations that are used to launch the services:

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
      "name": "dashboard",
      "path": "./vite-frontend",
      "command": "npx drizzle-kit studio"
    }
  ]
}
```

## Commands

- `harbor dock`: Generate a new harbor.json file
- `harbor moor`: Add new services to your harbor.json file
- `harbor launch`: Start all services defined in your harbor.json file in a tmux session

## Terminal Multiplexer

Harbor uses tmux for managing your services. Some useful shortcuts:

- `Ctrl+a d`: Detach from session
- `Ctrl+a c`: Create new window
- `Ctrl+a n`: Next window
- `Ctrl+a p`: Previous window
- `Ctrl+q`: Quit session

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
