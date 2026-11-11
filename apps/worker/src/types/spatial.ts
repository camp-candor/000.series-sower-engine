import { z } from 'zod'

export const EdgeAxialCoordSchema = z
    .object({
        q: z.number().int({
            message: '[FLOAT_PROHIBITED] Coordinate q must be an integer',
        }),
        r: z.number().int({
            message: '[FLOAT_PROHIBITED] Coordinate r must be an integer',
        }),
        s: z.number().int({
            message: '[FLOAT_PROHIBITED] Coordinate s must be an integer',
        }),
    })
    .strict()
    .refine((data) => data.q + data.r + data.s === 0, {
        message:
            '[CUBIC_INVARIANT_BREACH] Coordinate must satisfy q + r + s === 0',
    })

export type EdgeAxialCoord = z.infer<typeof EdgeAxialCoordSchema>

export const EdgeSpatialProofQuadrupleSchema = z
    .object({
        topologyHash: z.string().regex(/^[a-f0-9]{64}$/, {
            message: '[HASH_FORMAT_BREACH] topologyHash must be SHA-256',
        }),
        overlayHash: z.string().regex(/^[a-f0-9]{64}$/, {
            message: '[HASH_FORMAT_BREACH] overlayHash must be SHA-256',
        }),
        queryHash: z.string().regex(/^[a-f0-9]{64}$/, {
            message: '[HASH_FORMAT_BREACH] queryHash must be SHA-256',
        }),
        receiptHash: z.string().regex(/^[a-f0-9]{64}$/, {
            message: '[HASH_FORMAT_BREACH] receiptHash must be SHA-256',
        }),
    })
    .strict()

export type EdgeSpatialProofQuadruple = z.infer<
    typeof EdgeSpatialProofQuadrupleSchema
>

export const EdgeScrubbedPathQuerySchema = z
    .object({
        originPacked: z.number().int(),
        destinationPacked: z.number().int(),
        maxBudgetCostUnits: z.number().int().default(1000),
        workEnvelopeLimit: z.number().int().default(512),
    })
    .strict()

export type EdgeScrubbedPathQuery = z.infer<typeof EdgeScrubbedPathQuerySchema>

export interface EdgePathReceipt {
    readonly ok: boolean
    readonly origin: number
    readonly destination: number
    readonly path: readonly number[]
    readonly totalCostUnits: number
    readonly cellsExpanded: number
    readonly proofQuadruple: EdgeSpatialProofQuadruple
    readonly failureReason?: 'BUDGET_EXCEEDED' | 'OCCLUDED' | 'UNREACHABLE'
}
