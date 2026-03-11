#!/bin/bash
# Upload carousel-factory skill to Anthropic Custom Skills
# Requires: ANTHROPIC_API_KEY env var
# Returns: Skill ID -> set as CAROUSEL_SKILL_ID in .env.local

set -euo pipefail

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Error: ANTHROPIC_API_KEY not set"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$SCRIPT_DIR/../docs/carousel-factory-skill"
ZIP_FILE="$SCRIPT_DIR/../docs/carousel-factory-skill.zip"

# Clean up old zip if exists
rm -f "$ZIP_FILE"

# Create zip from skill directory
cd "$SKILL_DIR"
zip -r "$ZIP_FILE" .

echo "Uploading carousel-factory skill..."

curl "https://api.anthropic.com/v1/skills?beta=true" \
  -X POST \
  -H "X-Api-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: skills-2025-10-02" \
  -F "display_title=Carousel Factory" \
  -F "files[]=@$ZIP_FILE"

echo ""
echo "Copy the returned 'id' value and add it to .env.local as:"
echo "CAROUSEL_SKILL_ID=<id>"

# Clean up
rm -f "$ZIP_FILE"
