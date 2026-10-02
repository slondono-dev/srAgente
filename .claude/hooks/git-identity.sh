#!/bin/sh
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
git config user.name "slondono-dev"
git config user.email "jslondono145@gmail.com"
git config core.hooksPath .githooks
