#!/usr/bin/env python3
"""
CineSearch Master Regression Test Suite Runner
Discovers and runs all Python and JavaScript regression, unit, and integration tests.
Exits with 0 on success, 1 on failure.
"""

import os
import sys
import glob
import subprocess
import time

GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BOLD = '\033[1m'
RESET = '\033[0m'

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_js_tests():
    print(f"\n{CYAN}{BOLD}--- Running Frontend Unit & Feature Tests (Node.js) ---{RESET}")
    js_test_pattern = os.path.join(ROOT_DIR, 'tests', '**', '*.test.js')
    js_files = glob.glob(js_test_pattern, recursive=True)

    if not js_files:
        print(f"{YELLOW}No JS test files found.{RESET}")
        return True, 0, 0

    rel_js_files = [os.path.relpath(f, ROOT_DIR) for f in sorted(js_files)]
    cmd = ['node', '--test'] + rel_js_files
    
    start_time = time.time()
    result = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True)
    duration = time.time() - start_time

    print(result.stdout)
    if result.stderr:
        print(result.stderr)

    if result.returncode == 0:
        print(f"{GREEN}✓ Frontend tests passed ({len(js_files)} test suite files, {duration:.2f}s){RESET}")
        return True, len(js_files), 0
    else:
        print(f"{RED}✗ Frontend tests failed! ({duration:.2f}s){RESET}")
        return False, 0, len(js_files)

def run_py_tests():
    print(f"\n{CYAN}{BOLD}--- Running Backend Integration & Regression Tests (Python) ---{RESET}")
    py_test_pattern = os.path.join(ROOT_DIR, 'tests', '**', 'test_*.py')
    py_files = [f for f in glob.glob(py_test_pattern, recursive=True) if not f.endswith('run_regression_suite.py') and not f.endswith('add_test.py')]

    if not py_files:
        print(f"{YELLOW}No Python test files found.{RESET}")
        return True, 0, 0

    rel_py_files = [os.path.relpath(f, ROOT_DIR) for f in sorted(py_files)]
    cmd = [sys.executable, '-m', 'unittest'] + rel_py_files
    
    start_time = time.time()
    result = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True)
    duration = time.time() - start_time

    print(result.stdout)
    print(result.stderr)

    if result.returncode == 0:
        print(f"{GREEN}✓ Backend tests passed ({len(py_files)} test suite files, {duration:.2f}s){RESET}")
        return True, len(py_files), 0
    else:
        print(f"{RED}✗ Backend tests failed! ({duration:.2f}s){RESET}")
        return False, 0, len(py_files)

def main():
    print(f"{BOLD}===================================================={RESET}")
    print(f"{BOLD}        CineSearch Regression Test Suite           {RESET}")
    print(f"{BOLD}===================================================={RESET}")

    start_total = time.time()
    js_ok, js_passed, js_failed = run_js_tests()
    py_ok, py_passed, py_failed = run_py_tests()
    total_duration = time.time() - start_total

    print(f"\n{BOLD}===================================================={RESET}")
    print(f"{BOLD}               Regression Test Summary              {RESET}")
    print(f"{BOLD}===================================================={RESET}")
    print(f"Total Suites Executed: {js_passed + js_failed + py_passed + py_failed}")
    print(f"Passed: {GREEN}{js_passed + py_passed}{RESET}")
    print(f"Failed: {RED}{js_failed + py_failed}{RESET}")
    print(f"Total Duration: {total_duration:.2f}s")

    if js_ok and py_ok:
        print(f"\n{GREEN}{BOLD}🎉 ALL REGRESSION TESTS PASSED! Ready for commit/release.{RESET}\n")
        sys.exit(0)
    else:
        print(f"\n{RED}{BOLD}🚨 REGRESSION TEST SUITE FAILED! Commit blocked.{RESET}\n")
        sys.exit(1)

if __name__ == '__main__':
    main()
