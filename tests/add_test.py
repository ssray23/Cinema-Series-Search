#!/usr/bin/env python3
"""
CineSearch Test Auto-Scaffolder & Registration Tool
Use this CLI tool whenever adding a new feature or fixing a bug to automatically create 
a boilerplate test file and register it in tests/test_registry.json.

Usage:
  python3 tests/add_test.py --type [feature|bug] --name <test_name> --description "<desc>" [--lang js|py]

Example:
  python3 tests/add_test.py --type feature --name dark_mode_toggle --description "Tests dark mode theme persistence" --lang js
"""

import os
import sys
import json
import argparse

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_PATH = os.path.join(ROOT_DIR, 'tests', 'test_registry.json')

JS_TEMPLATE = """const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('__TEST_TITLE__', () => {
  // TODO: Add test implementation for __DESCRIPTION__
  assert.ok(true, '__TEST_TITLE__ initial placeholder pass');
});
"""

PY_TEMPLATE = """import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import server

class Test__CLASS_NAME__(unittest.TestCase):
    def test___TEST_FN_NAME__(self):
        # TODO: Add test implementation for __DESCRIPTION__
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()
"""

def main():
    parser = argparse.ArgumentParser(description="Auto-add a new feature or bug test case to the CineSearch regression suite.")
    parser.add_argument('--type', choices=['feature', 'bug'], required=True, help="Type of test: feature or bug")
    parser.add_argument('--name', required=True, help="Short snake_case name for the feature or bug (e.g. ott_filter_reset)")
    parser.add_argument('--description', required=True, help="Human-readable description of what this test verifies")
    parser.add_argument('--lang', choices=['js', 'py'], default='js', help="Test language: js (default) or py")

    args = parser.parse_args()

    category_dir = 'features' if args.type == 'feature' else 'bugs'
    target_dir = os.path.join(ROOT_DIR, 'tests', category_dir)
    os.makedirs(target_dir, exist_ok=True)

    clean_name = args.name.lower().replace('-', '_').replace(' ', '_')
    if args.lang == 'js':
        filename = f"test_{clean_name}.test.js"
    else:
        filename = f"test_{clean_name}.py"

    filepath = os.path.join(target_dir, filename)
    rel_path = os.path.relpath(filepath, ROOT_DIR)

    if os.path.exists(filepath):
        print(f"Error: Test file already exists at {rel_path}")
        sys.exit(1)

    # Generate content
    if args.lang == 'js':
        test_title = f"{args.type.upper()}: {clean_name.replace('_', ' ').title()}"
        content = JS_TEMPLATE.replace('__TEST_TITLE__', test_title).replace('__DESCRIPTION__', args.description)
    else:
        class_name = ''.join(x.title() for x in clean_name.split('_'))
        test_fn_name = clean_name
        content = PY_TEMPLATE.replace('__CLASS_NAME__', class_name).replace('__TEST_FN_NAME__', test_fn_name).replace('__DESCRIPTION__', args.description)

    with open(filepath, 'w') as f:
        f.write(content)

    # Update test_registry.json
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, 'r') as f:
            registry = json.load(f)
        
        registry_key = 'features' if args.type == 'feature' else 'bugs'
        registry['suites'][registry_key].append({
            "file": rel_path,
            "description": args.description
        })
        
        with open(REGISTRY_PATH, 'w') as f:
            json.dump(registry, f, indent=2)

    print(f"✅ Created new test scaffold: {rel_path}")
    print(f"✅ Registered test in tests/test_registry.json")
    print(f"\nNext steps:")
    print(f"1. Open {rel_path} and add your specific test assertions.")
    print(f"2. Run `python3 tests/run_regression_suite.py` to verify it passes.")

if __name__ == '__main__':
    main()
