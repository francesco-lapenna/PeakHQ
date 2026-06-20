---
description: Drive one TDD red-green-refactor cycle for a specific behavior
argument-hint: "<behavior to implement, e.g. 'GET /health returns 200'>"
allowed-tools: Bash, Read, Write, Edit
---

Run a TDD cycle for: $ARGUMENTS

## RED Phase

1. Identify the unit under test: which function, class, module, or endpoint?
2. Write a single failing test that expresses this behavior precisely.
   - Test name: `"should <behavior>"` or `"given <context> when <action> then <outcome>"`
   - Assert on the observable outcome, not on implementation internals.
   - Keep the test focused — one behavior per test.
3. Run the test suite.
4. **Verify the test FAILS** — and for the right reason. It must reach the assertion and fail it, not error on import or syntax. If it errors before the assertion, fix the test until it correctly fails.
5. Show me the failing test output.

Do NOT proceed to the Green phase until the Red phase output is confirmed.

## GREEN Phase

6. Write the minimum implementation code to make ONLY this test pass.
   - Resist the urge to generalize. Solve exactly what the test demands.
   - Do not write code for cases not yet tested.
7. Run the full test suite.
8. **Verify:** the new test passes AND zero previously-passing tests now fail.
9. Show me the full test output.

Do NOT proceed to Refactor if any test is failing.

## REFACTOR Phase

10. Review the implementation and test for:
    - Duplication (can anything be extracted?)
    - Naming (are names clear and intentional?)
    - CLAUDE.md quality rules (no TODOs, no commented-out code, no hardcoded values)
    - AWS Free Tier awareness if any infrastructure code was touched
11. Apply any cleanup. Run the tests again after each change.
12. Confirm tests are still green after refactor.

## Commit

Stage tests first, then implementation:
```
git add <test-file>
git add <implementation-file>
git commit -m "feat(<scope>): <behavior>"
```

For a pure test addition: `git commit -m "test(<scope>): add test for <behavior>"`
For test + implementation together: `git commit -m "feat(<scope>): <behavior> with tests"`
