// Phase 5: Dialogue AST egress schema.
// Every emitted beat carries its speaker, lines, pre-computed tension in
// integer basis points, explicit kinetic verbs, and held items so the
// somatic panopticon can validate physical authority before generation.

import { z } from 'zod'

export const DialogueBeatSchema = z.object({
    beatId: z.string(),
    speakerId: z.string(),
    lines: z.string(),
    tensionBps: z.number().int().min(0).max(10000),
    kineticVerbs: z.array(z.string()).default([]),
    heldItems: z.array(z.string()).default([]),
})

export const DialogueAstSchema = z.object({
    sceneId: z.string(),
    episodeNum: z.number().int().positive(),
    beats: z.array(DialogueBeatSchema),
    exitTrigger: z.string().optional(),
})

export type DialogueBeat = z.infer<typeof DialogueBeatSchema>
export type DialogueAst = z.infer<typeof DialogueAstSchema>
