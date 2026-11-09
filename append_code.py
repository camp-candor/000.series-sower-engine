import re
import os

def merge_ts_file(filepath, new_code):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            existing = f.read()
    except FileNotFoundError:
        existing = ""

    if filepath.endswith('engine.action.ts'):
        actions_to_add = ["BOOT_ENGINE", "STATUS_ENGINE", "AUDIT_ENGINE", "RESET_ENGINE"]
        classes_to_add = ["BootEngine", "StatusEngine", "AuditEngine", "ResetEngine"]

        new_content = existing

        actions_def = re.search(r'export type Actions =([\s\S]*)', existing)
        if actions_def:
            current_actions = actions_def.group(1).strip()

            new_classes_code = ""
            for act_const, act_class in zip(actions_to_add, classes_to_add):
                if act_const not in existing:
                    # extract from new_code with proper closing brace
                    block_regex = rf'(export const {act_const} =.*?\nexport class {act_class} implements Action {{.*?}})'
                    match = re.search(block_regex, new_code, re.DOTALL)
                    if match:
                        new_classes_code += match.group(1) + "\n\n"

            new_content = existing.replace('export type Actions =', new_classes_code + 'export type Actions =')
            for cls in classes_to_add:
                if cls not in current_actions:
                    new_content += f"\n    | {cls}"

        return new_content
    elif filepath.endswith('engine.interface.ts'):
        # Append new interfaces and type unions
        new_content = existing
        # EngineStatus has changed from 'OFFLINE' | 'READY' to 'OFFLINE' | 'BOOTING' | 'READY' | 'ERROR'
        # Just manually replace it
        if "export type EngineStatus" in new_content:
            new_content = re.sub(r"export type EngineStatus =.*", "export type EngineStatus = 'OFFLINE' | 'BOOTING' | 'READY' | 'ERROR'", new_content)

        interfaces = ["TableStatusReport", "EngineStatusReport", "EngineAuditReceipt", "EngineBootReceipt", "BootEngineParams"]
        for interface in interfaces:
            if interface not in new_content:
                match = re.search(rf'(export interface {interface} {{.*?}})', new_code, re.DOTALL)
                if match:
                    new_content += "\n\n" + match.group(1)

        # We need to update Engine interface fields
        if "lastBootMs: number" not in new_content:
            engine_int = re.search(r'export default interface Engine \{(.*?)\}', new_content, re.DOTALL)
            if engine_int:
                fields = engine_int.group(1)
                new_fields = """
    idx: string
    status: EngineStatus
    booted: boolean
    seriesSlug: string
    lastBootMs: number
    lastStateHash: string
    lastAuditReceipt?: EngineAuditReceipt
    lastStatusReport?: EngineStatusReport"""
                new_content = new_content.replace(fields, new_fields + "\n")
        return new_content

    elif filepath.endswith('engine.bit.ts'):
        # Just overwrite
        return new_code
    elif filepath.endswith('engine.model.ts'):
        # Need to update EngineModel fields
        new_content = existing
        if "lastBootMs: number = 0" not in new_content:
            model_int = re.search(r'export class EngineModel implements Engine \{(.*?)\}', new_content, re.DOTALL)
            if model_int:
                fields = model_int.group(1)
                new_fields = """
    idx: string = '00.engine'
    status: EngineStatus = 'OFFLINE'
    booted: boolean = false
    seriesSlug: string = 'under-the-floorboards'
    lastBootMs: number = 0
    lastStateHash: string = '0'.repeat(64)
    lastAuditReceipt?: EngineAuditReceipt
    lastStatusReport?: EngineStatusReport"""
                new_content = new_content.replace(fields, new_fields + "\n")

            # Need to update imports
            imports = """
import type {
    EngineStatus,
    EngineAuditReceipt,
    EngineStatusReport,
} from './fce/engine.interface.js'"""
            new_content = new_content.replace("import type Engine from './fce/engine.interface.js'", "import type Engine from './fce/engine.interface.js'\n" + imports)
        return new_content

    elif filepath.endswith('engine.buzz.ts'):
        new_functions = ["bootEngine", "statusEngine", "auditEngine", "resetEngine"]
        new_content = existing

        # The prompt wants us to override initEngine!
        # "initEngine: Initializes the unit model and transitions status to READY or OFFLINE."
        match_init = re.search(r'(export const initEngine =.*?^\})', new_code, re.DOTALL | re.MULTILINE)
        if match_init:
             new_content = re.sub(r'export const initEngine =.*?^\}', match_init.group(1), new_content, flags=re.DOTALL | re.MULTILINE)

        for func in new_functions:
            if func not in existing:
                match = re.search(rf'(export const {func} =.*?^\}}$)', new_code, re.DOTALL | re.MULTILINE)
                if match:
                    new_content += "\n\n" + match.group(1)

        # Update imports
        imports = """
import type {
    EngineStatusReport,
    EngineAuditReceipt,
    EngineBootReceipt,
    TableStatusReport,
    BootEngineParams,
} from '../fce/engine.interface.js'
import * as ActDbs from '../../02.database.unit/database.action.js'
import * as ActSte from '../../16.state.unit/state.action.js'
import { sha256Hex } from '../../04.envelope.unit/envelope.buzzer.js'"""
        if "TableStatusReport" not in new_content:
             new_content = new_content.replace("import type EngineBit from '../fce/engine.bit.js'", "import type EngineBit from '../fce/engine.bit.js'" + imports)

        if "function emitConsole" not in new_content:
             emit_func = re.search(r'(async function emitConsole.*?^\})', new_code, re.DOTALL | re.MULTILINE)
             if emit_func:
                 new_content = new_content.replace("export const initEngine", emit_func.group(1) + "\n\nexport const initEngine")

        return new_content
    elif filepath.endswith('engine.buzzer.ts'):
        new_content = existing
        for func in ["bootEngine", "statusEngine", "auditEngine", "resetEngine"]:
            if func not in existing:
                new_content += f"\nexport {{ {func} }} from './buz/engine.buzz.js'"
        # Need to export types from buzzer.ts
        if "EngineBootReceipt" not in new_content:
             new_content += """
export type {
    EngineStatus,
    TableStatusReport,
    EngineStatusReport,
    EngineAuditReceipt,
    EngineBootReceipt,
    BootEngineParams,
} from './fce/engine.interface.js'
export type {
    EnginePayload,
} from './fce/engine.bit.js'
"""
        return new_content
    elif filepath.endswith('engine.reduce.ts'):
        new_cases = ["BOOT_ENGINE", "STATUS_ENGINE", "AUDIT_ENGINE", "RESET_ENGINE"]
        new_content = existing
        for case in new_cases:
            if case not in existing:
                match = re.search(rf'(case Act\.{case}:.*?return .*?\n)', new_code, re.DOTALL)
                if match:
                    new_content = new_content.replace('default:', match.group(1) + '\n        default:')
        return new_content
    elif filepath.endswith('engine.unit.ts'):
        return existing # unchanged
    elif filepath.endswith('engine.test.ts'):
        # This is a NEW file in instructions, but it actually exists!
        # So we should append its tests to the existing test file? Wait, instructions say *(NEW)*. So maybe we should overwrite it?
        # Actually it's better to create a new file or append. Let's see what is inside engine.test.ts currently.
        return new_code # The instructions literally provide the full file contents. But it will delete existing tests. Let's just append the suite.

with open('data/directive/day-002/060.phase-24.jules.md', 'r', encoding='utf-8') as f:
    content = f.read()

matches = re.finditer(r'#### \d+\.\s+(packages/.*?)\s+\*\((NEW|UPDATE)\)\*[\s\S]*?```(?:typescript)?\n([\s\S]*?)```', content)
for match in matches:
    filepath = match.group(1).strip()
    code = match.group(3)

    if filepath.endswith('engine.test.ts'):
        # Append the new describe block instead of overwriting
        try:
             with open(filepath, 'r', encoding='utf-8') as f:
                 existing_test = f.read()
             if 'Orchestrator Battery' not in existing_test:
                 match_desc = re.search(r'(describe\(\'00.engine.unit - Engine Master Lifecycle Orchestrator Battery\', \(\) => \{.*?^\}\))', code, re.DOTALL | re.MULTILINE)
                 if match_desc:
                     new_test = existing_test + "\n\n" + match_desc.group(1)
                     with open(filepath, 'w', encoding='utf-8') as f:
                         f.write(new_test)
        except Exception:
             with open(filepath, 'w', encoding='utf-8') as f:
                 f.write(code)
    else:
        merged_code = merge_ts_file(filepath, code)
        if merged_code is not None:
            with open(filepath, 'w', encoding='utf-8') as out_f:
                out_f.write(merged_code)
