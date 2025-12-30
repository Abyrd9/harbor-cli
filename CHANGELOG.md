# Changelog

All notable changes to this project will be documented in this file. 
## v0.0.2 - 2024-12-29

Updating note in readme about some services being difficult for Caddy and HMR


## v0.0.3 - 2025-01-18

Caddyfile is now not required if no subdomain exists in the configuration file


## v0.1.0 - 2025-02-05

Adding support to put configuration into package.json if it exists rather than defaulting to creating harbor.json


## v0.1.1 - 2025-03-21

Fixing useSudo and caddy tab


## v1.0.0 - 2025-04-30

Removing references or work around managing and setting up Caddy. It's just too much work for little gain.


## v1.0.1 - 2025-06-20

Updating packages


## v1.1.0 - 2025-09-03

Adding support for before/after scripts in config


## v1.1.1 - 2025-10-21

Adding helpful tips to install TMUX and JQ if they are not yet installed when using CLI


## v2.0.0 - 2025-12-30

- Add service logging for AI agents (`log: true` streams output to `.harbor/` directory)
- Add configurable `maxLogLines` per service to prevent log files from growing unbounded
- Logs are automatically stripped of ANSI escape codes for clean, readable output
- Auto-generate changelog from git commits in release script

## v2.0.1 - 2025-12-30

- 2.0.1
- Updating release again


## v2.0.2 - 2025-12-30

- 2.0.2
- Fixing bugs around logs
- 2.0.1
- Updating release again

