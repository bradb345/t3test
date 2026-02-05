---
name: review-pr
description: Review GitHub PR comments and address valid suggestions
argument-hint: [pr-url-or-number]
---

# Review Pull Request Comments

Review the pull request at $ARGUMENTS and address valid suggestions from reviewers.

## Instructions

1. **Extract PR number** from the URL or use the number directly

2. **Fetch PR information** using GitHub CLI:
   - `gh pr view <number> --json reviews,comments`
   - `gh api repos/{owner}/{repo}/pulls/<number>/comments` for inline review comments

3. **Evaluate each comment/suggestion**:
   - Determine if the suggestion is valid and improves the code
   - Consider: code quality, correctness, maintainability, performance
   - Check if implementing the suggestion would break other things (like linting)

4. **For valid suggestions**:
   - Make the code changes
   - Explain what was changed and why

5. **For invalid suggestions**:
   - Explain why the suggestion was not implemented
   - Provide reasoning (e.g., "would reintroduce linting errors", "not applicable to this context")

6. **Summary**: Provide a clear summary of:
   - Which suggestions were addressed
   - Which were skipped and why

## Notes

- Always verify changes pass linting after modifications: `npm run lint`
- Maintain existing code style and patterns
- If a suggestion conflicts with project requirements (like ESLint rules), explain and skip it
