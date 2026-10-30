import { describe, it, expect, vi, afterEach } from 'vitest'
import { MenuModel } from './menu.model.js'
import { initMenu, updateMenu } from './buz/00.menu.buzz.js'

const SUBMENU_CHOICES = [
    ' Audit Fence',
    ' Check Artifacts',
    ' Audit Boundary',
    ' Profile Budget',
    ' Step 1 Tick',
    ' Fast Forward 100 Ticks',
    'ROOT MENU',
]

const mockLibrary = (choice: string, grids: any[], choices: string[]) => {
    return vi.fn(async (type: string, bale: any) => {
        if (type === '[Grid action] Update Grid') {
            grids.push(bale)
            return { grdBit: { dat: { net: 1 } } }
        }
        if (type === '[Open action] Open Choice') {
            choices.push(...bale.lst)
            return { chcBit: { src: choice } }
        }
        return {}
    })
}

describe('menu routing', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete (global as any).LIBRARY
    })

    it('renders the audit submenu on grid columns 0-4', async () => {
        const grids: any[] = []
        const choices: string[] = []
        ;(global as any).LIBRARY = {
            hunt: mockLibrary('ROOT MENU', grids, choices),
        }
        const engineHunt = vi.fn(async () => ({}))

        await updateMenu(
            new MenuModel(),
            {} as any,
            { hunt: engineHunt } as any,
        )

        for (const choice of SUBMENU_CHOICES) {
            expect(choices).toContain(choice)
        }
        const choiceGrid = grids.find((g) => g.x === 0 && g.xSpan === 4)
        expect(choiceGrid).toBeTruthy()
    })

    it('returns to the master switchboard via ROOT MENU', async () => {
        const grids: any[] = []
        const choices: string[] = []
        ;(global as any).LIBRARY = {
            hunt: mockLibrary('ROOT MENU', grids, choices),
        }
        const engineHunt = vi.fn(async () => ({}))
        const rootSlv = vi.fn()

        const result = await initMenu(
            new MenuModel(),
            { slv: rootSlv } as any,
            { hunt: engineHunt } as any,
        )

        expect(result).toBeInstanceOf(MenuModel)
        expect(rootSlv).toHaveBeenCalledOnce()
        expect(rootSlv.mock.calls[0][0]).toEqual({
            mnuBit: { idx: 'root-menu' },
        })
    })
})
