# Harbor CLI

A CLI tool for those small side projects that only run a few services. Harbor allows you to:

1. 🛠️ Define your services in a configuration file
2. 🔄 Generate a Caddyfile to reverse proxy certain services to subdomains
3. 🚀 Launch your services in a tmux session with Caddy and your services automatically proxied

## Installation

```bash
npm i -g harbor-cli
```

## Prerequisites

Before using Harbor, make sure you have the following installed:

- [Caddy](https://caddyserver.com/docs/install) (for reverse proxy)
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

3. Update your Caddyfile:
```bash
harbor anchor
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
    },
    {
      "name": "dashboard",
      "path": "./vite-frontend",
      "command": "npx drizzle-kit studio",
    }
  ]
}
```

> Note: The dashboard service is a bit special. This is a drizzle studio instance to view your database. There's no subdomain value and no port declared because it typically runs at `local.drizzle.studio`. This will still be running and viewable in your tmux session, but it won't be automatically proxied.

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

- `harbor dock`: Generate a new harbor.json file
- `harbor moor`: Add new services to your harbor.json file
- `harbor anchor`: Update your Caddyfile from the current harbor.json file
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
