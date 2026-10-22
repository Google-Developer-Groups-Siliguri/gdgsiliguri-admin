#!/bin/bash
set -euo pipefail

for candidate in "${JAVA_HOME:-}" /opt/homebrew/opt/openjdk@21 /opt/homebrew/opt/openjdk /usr/local/opt/openjdk@21; do
  if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then
    major=$("$candidate/bin/java" -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+).*/\1/')
    if [ "$major" -ge 21 ]; then
      export JAVA_HOME="$candidate"
      export PATH="$candidate/bin:$PATH"
      break
    fi
  fi
done

exec npx firebase emulators:start --project demo-gdg-siliguri "$@"
