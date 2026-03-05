#!/bin/bash

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_step() {
    echo -e "${GREEN}$1${NC}"
}

log_warn() {
    echo -e "${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}" >&2
}

abort() {
    log_error "$1"
    exit 1
}

load_env() {
    if [ -f .env ]; then
        set -a
        # shellcheck disable=SC1091
        source .env
        set +a
    fi
}

ensure_clean_worktree() {
    if [ -n "$(git status --porcelain)" ]; then
        abort "Working tree is not clean. Commit or stash changes before releasing."
    fi
}

ensure_main_branch() {
    local current_branch
    current_branch=$(git branch --show-current)

    if [ "$current_branch" != "main" ]; then
        abort "Releases must be cut from main. Current branch: $current_branch"
    fi
}

ensure_npm_token() {
    if [ -z "${NPM_TOKEN:-}" ]; then
        abort "NPM_TOKEN environment variable is not set. Add it to .env or export it before releasing."
    fi
}

select_bump_type() {
    local version_type

    echo -e "${GREEN}Select version bump type:${NC}" >&2
    echo "1) patch (0.0.x) - Bug fixes" >&2
    echo "2) minor (0.x.0) - New features" >&2
    echo "3) major (x.0.0) - Breaking changes" >&2
    read -r version_type

    case "$version_type" in
        1) echo "patch" ;;
        2) echo "minor" ;;
        3) echo "major" ;;
        *) abort "Invalid selection" ;;
    esac
}

compute_next_version() {
    local current_version
    current_version=$(node -p "require('./package.json').version")

    node -e "
const version = process.argv[1];
const bump = process.argv[2];
const [major, minor, patch] = version.split('.').map(Number);

if ([major, minor, patch].some(Number.isNaN)) {
  console.error('Invalid current version:', version);
  process.exit(1);
}

if (bump === 'patch') {
  console.log(\`\${major}.\${minor}.\${patch + 1}\`);
} else if (bump === 'minor') {
  console.log(\`\${major}.\${minor + 1}.0\`);
} else if (bump === 'major') {
  console.log(\`\${major + 1}.0.0\`);
} else {
  console.error('Unsupported bump type:', bump);
  process.exit(1);
}
" "$current_version" "$1"
}

ensure_remote_is_up_to_date() {
    log_step "Fetching latest main..."
    git fetch origin main

    if ! git merge-base --is-ancestor origin/main HEAD; then
        abort "Local main is behind origin/main. Pull/rebase before releasing."
    fi
}

ensure_version_is_unpublished() {
    local package_name="$1"
    local next_version="$2"

    if npm view "${package_name}@${next_version}" version >/dev/null 2>&1; then
        abort "Version ${next_version} is already published. Choose a newer version."
    fi
}

update_package_version() {
    local next_version="$1"

    node -e "
const fs = require('node:fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.version = process.argv[1];
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
" "$next_version"
}

append_changelog_entry() {
    local new_version="$1"
    local today="$2"
    local previous_tag="$3"
    local commit_range
    local commits

    if [ -n "$previous_tag" ]; then
        commit_range="${previous_tag}..HEAD"
        commits=$(git log --pretty=format:"- %s" "$commit_range")
    else
        commits=$(git log --pretty=format:"- %s")
    fi

    if [ -z "$commits" ]; then
        commits="- Bug fixes and improvements"
    fi

    {
        printf "\n## %s - %s\n\n" "$new_version" "$today"
        printf "%s\n" "$commits"
    } >> CHANGELOG.md

    log_step "Added to changelog:"
    echo "$commits"
}

main() {
    local bump
    local package_name
    local new_version
    local previous_tag
    local today

    load_env
    ensure_npm_token
    ensure_main_branch
    ensure_clean_worktree

    bump=$(select_bump_type)
    package_name=$(node -p "require('./package.json').name")
    new_version=$(compute_next_version "$bump")

    ensure_remote_is_up_to_date
    ensure_version_is_unpublished "$package_name" "$new_version"

    log_step "Building project..."
    bun run build

    log_step "Updating package version to ${new_version}..."
    update_package_version "$new_version"

    today=$(date +"%Y-%m-%d")
    previous_tag=$(git describe --tags --abbrev=0 HEAD 2>/dev/null || true)

    log_step "Generating changelog from commits..."
    append_changelog_entry "$new_version" "$today" "$previous_tag"

    git add package.json CHANGELOG.md dist bun.lock
    git commit -m "$new_version"
    git tag "v${new_version}"

    log_step "Publishing to npm..."
    npm publish --access public --//registry.npmjs.org/:_authToken="$NPM_TOKEN"

    log_step "Pushing changes to repository..."
    git push origin main
    git push origin "v${new_version}"

    log_step "Release ${new_version} complete!"
}

main "$@"
