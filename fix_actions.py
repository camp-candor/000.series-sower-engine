import re

with open('packages/300.engine/00.engine.unit/engine.action.ts', 'r', encoding='utf-8') as f:
    existing = f.read()

# I already appended actions using append_code.py and the classes missed closing braces because I used a bad regex capture.
# Wait, let me just replace it properly.
