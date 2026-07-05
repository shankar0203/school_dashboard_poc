#!/usr/bin/env bash
# ===========================================================================
#  validate-auth.sh — smoke-test the API's auth boundary on a deployment
# ---------------------------------------------------------------------------
#  Usage:
#    BASE_URL=http://localhost:4000 ./scripts/validate-auth.sh
#    BASE_URL=https://api.school.example ID_TOKEN=<cognito-id-jwt> ./scripts/validate-auth.sh
#
#  - Without ID_TOKEN: verifies the API REJECTS unauthenticated access.
#  - With ID_TOKEN:     also verifies an authenticated user can read, and that
#                       write permission matches their role.
#
#  Get an ID token from the browser after signing in:
#    DevTools > Application > Local Storage > find the key ending in
#    ".idToken" (CognitoIdentityServiceProvider...idToken) and copy the value.
# ===========================================================================
set -u

BASE_URL="${BASE_URL:-http://localhost:4000}"
ID_TOKEN="${ID_TOKEN:-}"
pass=0; fail=0

# code URL [METHOD] [AUTH]  -> prints the HTTP status
code() {
  local url="$1" method="${2:-GET}" auth="${3:-none}"
  local args=(-s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json")
  [ "$method" = "POST" ] || [ "$method" = "PUT" ] && args+=(-d '{}')
  case "$auth" in
    token) args+=(-H "Authorization: Bearer ${ID_TOKEN}") ;;
    bad)   args+=(-H "Authorization: Bearer not-a-real-token") ;;
  esac
  curl "${args[@]}" "${BASE_URL}${url}"
}

# check "label" expected_regex actual
check() {
  local label="$1" expect="$2" got="$3"
  if [[ "$got" =~ $expect ]]; then
    printf "  \033[32m✓\033[0m %-52s [%s]\n" "$label" "$got"; pass=$((pass+1))
  else
    printf "  \033[31m✗\033[0m %-52s [got %s, want %s]\n" "$label" "$got" "$expect"; fail=$((fail+1))
  fi
}

echo "Validating auth boundary at: ${BASE_URL}"
echo ""
echo "── Public / unauthenticated ─────────────────────────────"
check "GET /health is reachable (public)"          "^(200|500)$" "$(code /health)"
check "GET /students without token -> 401"          "^401$"       "$(code /students)"
check "GET /students with bad token -> 401"         "^401$"       "$(code /students GET bad)"
check "POST /marks/bulk without token -> 401"       "^401$"       "$(code /marks/bulk POST)"
check "PUT /timetable without token -> 401"         "^401$"       "$(code /timetable PUT)"
check "unknown route without token -> 401"          "^401$"       "$(code /nope)"

if [ -n "$ID_TOKEN" ]; then
  echo ""
  echo "── Authenticated (token provided) ───────────────────────"
  check "GET /students with token -> 200"           "^200$"       "$(code /students GET token)"
  check "GET /meta/classes with token -> 200"       "^200$"       "$(code /meta/classes GET token)"
  # A write: expect 200/400 if the role is allowed, 403 if not.
  # (400 means it passed the role check but the empty body was rejected.)
  check "POST /marks/bulk with token -> 200/400/403" "^(200|400|403)$" "$(code /marks/bulk POST token)"
  echo ""
  echo "  Note: for the write above, 200/400 = your role CAN enter marks,"
  echo "        403 = your role is correctly blocked from entering marks."
else
  echo ""
  echo "  (No ID_TOKEN set — skipped authenticated checks.)"
  echo "  Re-run with ID_TOKEN=<jwt> to validate role-based access."
fi

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Result: ${pass} passed, ${fail} failed"
[ "$fail" -eq 0 ] && exit 0 || exit 1
