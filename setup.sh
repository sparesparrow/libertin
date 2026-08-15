#!/bin/bash
# Libertin — Local development setup script
# Clones the repository and installs all dependencies for web + mobile + Storybook

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Libertin — Local Development Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check system prerequisites
echo -e "${YELLOW}→ Checking prerequisites...${NC}"

# Check Node version
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js is not installed${NC}"
  echo "  Install from https://nodejs.org (requires Node >= 20)"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}✗ Node.js version must be >= 20 (found: v$(node -v | cut -d'v' -f2))${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check pnpm version
if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}✗ pnpm is not installed${NC}"
  echo "  Install from https://pnpm.io (requires pnpm >= 9)"
  exit 1
fi

PNPM_VERSION=$(pnpm -v | cut -d'.' -f1)
if [ "$PNPM_VERSION" -lt 9 ]; then
  echo -e "${RED}✗ pnpm version must be >= 9 (found: $(pnpm -v))${NC}"
  echo "  Run: npm install -g pnpm"
  exit 1
fi
echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"

# Check git
if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ Git is not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Git $(git --version | awk '{print $3}')${NC}"

echo ""

# If repo path is provided, clone it
if [ -n "$1" ]; then
  REPO_PATH="$1"

  if [ -d "$REPO_PATH" ]; then
    echo -e "${YELLOW}→ Using existing directory: $REPO_PATH${NC}"
    cd "$REPO_PATH"
  else
    echo -e "${YELLOW}→ Cloning repository...${NC}"
    # Assume sparesparrow/libertin if only owner provided, or full path otherwise
    if [[ "$REPO_PATH" == *"/"* ]]; then
      REPO_URL="https://github.com/$REPO_PATH.git"
    else
      REPO_URL="https://github.com/sparesparrow/libertin.git"
    fi
    git clone "$REPO_URL" "$REPO_PATH"
    cd "$REPO_PATH"
    echo -e "${GREEN}✓ Repository cloned${NC}"
  fi
fi

# Verify we're in the libertin repo
if [ ! -f "package.json" ] || ! grep -q '"name": "libertin"' package.json; then
  echo -e "${RED}✗ Not in the libertin repository root${NC}"
  echo "  Run this script from the repo root, or: setup.sh /path/to/libertin"
  exit 1
fi

echo -e "${GREEN}✓ Libertin repository detected${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}→ Installing dependencies with pnpm...${NC}"
pnpm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Type check
echo ""
echo -e "${YELLOW}→ Running type check...${NC}"
pnpm type-check
echo -e "${GREEN}✓ Type check passed${NC}"

# Initialize MSW worker for web app
echo ""
echo -e "${YELLOW}→ Setting up Mock Service Worker (MSW) for web...${NC}"
pnpm --filter=@libertin/web msw:init 2>/dev/null || true
if [ -f "apps/web/public/mockServiceWorker.js" ]; then
  echo -e "${GREEN}✓ MSW worker initialized${NC}"
else
  echo -e "${YELLOW}⚠ MSW worker not found (may need manual setup)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "  ${BLUE}Storybook${NC} (all UI components, web + native):"
echo "    pnpm storybook"
echo ""
echo "  ${BLUE}Web${NC} (Next.js 14, offline against MSW):"
echo "    pnpm --filter=@libertin/web dev"
echo ""
echo "  ${BLUE}Mobile${NC} (Expo, React Native):"
echo "    pnpm --filter=@libertin/mobile start"
echo ""
echo "  ${BLUE}Type check${NC} (all packages):"
echo "    pnpm type-check"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  • Working agreement: ./CLAUDE.md"
echo "  • Project backlog: ./docs/backlog.yaml"
echo "  • Architecture decisions: ./docs/adr/"
echo ""
