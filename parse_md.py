import re
import os

with open('data/directive/day-003/032.phase-two.jules.md', 'r') as f:
    content = f.read()

# Pattern to find headers like "#### 1. `path/to/file`" followed by a code block
pattern = r'#### \d+\.\s+`(.*?)`\s*\n\s*```(?:typescript|ts)?\n(.*?)```'
matches = re.findall(pattern, content, re.DOTALL)

for filepath, code in matches:
    print(f"File: {filepath}")
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        f.write(code)
print("Done parsing.")
