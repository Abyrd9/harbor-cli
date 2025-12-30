#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo -e "${YELLOW}Warning: You're not on the main branch. Continue? (y/N)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes. Continue? (y/N)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
fi

# Prompt for version bump type
echo -e "${GREEN}Select version bump type:${NC}"
echo "1) patch (0.0.x) - Bug fixes"
echo "2) minor (0.x.0) - New features"
echo "3) major (x.0.0) - Breaking changes"
read -r version_type

case $version_type in
    1) bump="patch";;
    2) bump="minor";;
    3) bump="major";;
    *) echo "Invalid selection"; exit 1;;
esac

# Build the project
echo -e "${GREEN}Building project...${NC}"
npm run build

# Update version
echo -e "${GREEN}Bumping version...${NC}"
new_version=$(npm version $bump)

# Generate changelog entry from commits since last tag
date=$(date +"%Y-%m-%d")
echo -e "${GREEN}Generating changelog from commits...${NC}"

# Get the previous tag
previous_tag=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")

# Get commits since last tag (or all commits if no previous tag)
if [ -n "$previous_tag" ]; then
    commits=$(git log --pretty=format:"- %s" "$previous_tag"..HEAD)
else
    commits=$(git log --pretty=format:"- %s")
fi

if [ -z "$commits" ]; then
    commits="- Bug fixes and improvements"
fi

echo -e "\n## $new_version - $date\n" >> CHANGELOG.md
echo -e "$commits\n" >> CHANGELOG.md

echo -e "${GREEN}Added to changelog:${NC}"
echo "$commits"

# Commit changelog
git add CHANGELOG.md
git commit --amend --no-edit

# Publish
echo -e "${GREEN}Publishing to npm...${NC}"
bun publish

# Push changes
echo -e "${GREEN}Pushing changes to repository...${NC}"
git push origin main
git push origin --tags

echo -e "${GREEN}Release $new_version complete!${NC}" 