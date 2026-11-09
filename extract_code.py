import re
import os

with open('data/directive/day-002/060.phase-24.jules.md', 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.finditer(r'#### \d+\.\s+(packages/.*?)\s+\*\((NEW|UPDATE)\)\*[\s\S]*?```(?:typescript)?\n([\s\S]*?)```', content)
for match in matches:
    filepath = match.group(1).strip()
    code = match.group(3)
    # Filter out imports for Actions that don't exist anymore or we deleted.

    # Actually, we shouldn't overwrite the entire file if we are breaking existing functionality that depends on it.

    # Wait, the instruction says *(UPDATE)* or *(NEW)*. If it's update, it means we must append, or replace entirely?
    # Usually in these tests it replaces entirely if it gives the full file contents. But since `test:pure` fails with missing functions like `checkArtifacts` and missing Actions, it means the code blocks we extracted lacked these functions/actions, which were present in the original files before we overwrote them.
