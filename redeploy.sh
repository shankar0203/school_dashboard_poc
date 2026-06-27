#!/bin/bash
# Deprecated — use deploy.sh (it handles both first deploy and redeploys).
exec "$(dirname "$0")/deploy.sh" "$@"
