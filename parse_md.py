import re

with open('data/directive/day-002/060.phase-24.jules.md', 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.finditer(r'#### \d+\.\s+(packages/.*?)\s+\*\((NEW|UPDATE)\)\*[\s\S]*?```(?:typescript)?\n([\s\S]*?)```', content)
for match in matches:
    filepath = match.group(1).strip()
    code = match.group(3)
    mode = match.group(2)

    print(f"File: {filepath} ({mode})")
