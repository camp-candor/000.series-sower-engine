import re

with open('packages/300.engine/00.engine.unit/buz/engine.buzz.ts', 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActSte from '../../16.state.unit/state.action.js'
import { sha256Hex } from '../../04.envelope.unit/envelope.buzzer.js'
"""

if 'import * as ActDbs' not in content:
    # insert after the last import
    content = content.replace("import type EngineBit from '../fce/engine.bit.js'", "import type EngineBit from '../fce/engine.bit.js'\n" + imports)

with open('packages/300.engine/00.engine.unit/buz/engine.buzz.ts', 'w', encoding='utf-8') as f:
    f.write(content)
