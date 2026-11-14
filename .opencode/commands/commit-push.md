---
name: commit-push
description:
  Stages all modified and untracked files, generates a Conventional Commit
  message summarizing the diff, commits the changes, and pushes to GitHub using
  gh authentication.
---

# Commit and Push Changes

Stage all current changes, summarize the diff into a clean commit message,
commit, and push to the remote GitHub repository. Optional extra context from
user: **$ARGUMENTS**

## Prerequisites & Guardrails

- **Never** commit `.env` files, secrets, credentials, or files matched by
  `.gitignore`.
- If on `main` or `master`, ask for confirmation before pushing directly unless
  instructed otherwise.

## Steps

1. **Verify GitHub CLI Authentication & Repo Context** Run `gh auth status` and
   `gh repo view --json nameWithOwner,defaultBranchRef` to confirm GitHub CLI is
   authenticated and the remote repository is reachable. If authentication
   fails, stop and instruct the user to run `gh auth login`.

2. **Inspect Working Tree & Stage Changes** Run `git status` to review untracked
   and modified files. Check that no sensitive files (such as `.env` or private
   keys) are about to be staged. Stage all safe changes using:
   ```bash
   git add -A
   ```

````

3. **Analyze Diff & Generate Commit Message**
Run `git diff --cached --stat` and `git diff --cached` to inspect the exact staged changes.
* Summarize the changes into a **Conventional Commit** message (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`) with a concise subject line (under 72 characters) and bulleted body points if multiple components changed.
* Incorporate any context provided in **$ARGUMENTS** if present.


4. **Commit Changes**
Commit the staged files using the generated summary:
```bash
git commit -m "<type>: <concise summary>" -m "<detailed bullet summary>"

````

5. **Push to GitHub** Check the current branch with `git branch --show-current`
   and push to `origin`, setting upstream tracking if needed:

```bash
git push -u origin HEAD

```

Verify the remote state using `gh repo view --web` (only if requested) or
confirm the pushed commit hash and branch URL in the final response.
