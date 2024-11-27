# Harbor CLI

A simple CLI tool for those small side projects that run a few services. Harbor was created to make it a little easier/cleaner to run these services locally. It does this in a few simple steps:

1. 🛠️ Adds a configuration file describing your services
2. 🔄 Updates/creates/runs caddy to serve the services under a subdomain
3. 🚀 Launches your services in a tmux session

## Installation

```bash
go install github.com/Abyrd9/harbor@latest
```

## Prerequisites

Before using Harbor, make sure you have the following installed:

- [Caddy](https://caddyserver.com/docs/install) (for reverse proxy)
- [tmux](https://github.com/tmux/tmux/wiki/Installing) (for terminal multiplexing)
- [jq](https://stedolan.github.io/jq/download/) (for JSON processing within tmux)

## Quick Start

1. Initialize your development environment:
```bash
harbor anchor
```

2. Add new services to your configuration:
```bash
harbor dock
```

3. Update your Caddyfile:
```bash
harbor moor
```

4. Launch your services:
```bash
harbor launch
```

## Configuration

Harbor uses two main configuration files:

### harbor.json

Contains your service configurations that are used to generate the Caddyfile and launch the services:

```json
{
  "domain": "localhost",
  "services": [
    {
      "name": "frontend",
      "path": "./vite-frontend",
      "command": "npm run dev",
      "port": 3000,
      "subdomain": "app"
    },
    {
      "name": "api",
      "path": "./go-api",
      "command": "go run .",
      "port": 8080,
      "subdomain": "api"
    }
  ]
}
```

### Caddyfile

Automatically generated reverse proxy configuration:

```caddy
api.localhost {
    reverse_proxy localhost:8080
}

app.localhost {
    reverse_proxy localhost:3000
}
```

## Commands

- `harbor anchor`: Generate a new harbor.json file
- `harbor dock`: Add new services to your harbor.json file
- `harbor moor`: Update your Caddyfile from the current harbor.json file
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
