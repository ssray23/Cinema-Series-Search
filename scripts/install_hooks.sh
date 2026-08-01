#!/usr/bin/env bash
# CineSearch Git Hook Installer

HOOK_DIR="$(git rev-parse --git-dir 2>/dev/null)/hooks"

if [ -z "$HOOK_DIR" ]; then
    echo "Error: Not inside a git repository."
    exit 1
fi

mkdir -p "$HOOK_DIR"

PRE_COMMIT_HOOK="$HOOK_DIR/pre-commit"

cat << 'EOF' > "$PRE_COMMIT_HOOK"
#!/usr/bin/env bash
# CineSearch Git Pre-Commit Hook
# Ensures that the entire regression test suite passes before code is committed.

echo "🔍 Running CineSearch Mandatory Pre-Commit Regression Suite..."
python3 tests/run_regression_suite.py

STATUS=$?
if [ $STATUS -ne 0 ]; then
    echo ""
    echo "❌ COMMIT REJECTED: Regression test suite failed."
    echo "Fix failing tests or add new tests using: python3 tests/add_test.py"
    exit 1
fi

echo "✅ Pre-commit check passed."
exit 0
EOF

chmod +x "$PRE_COMMIT_HOOK"
echo "✅ Git pre-commit hook successfully installed to $PRE_COMMIT_HOOK"
