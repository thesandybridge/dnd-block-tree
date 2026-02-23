import { describe, it, expect, vi } from 'vitest';
import { adaptCollisionDetection } from './bridge';
function makeDOMRect(top, left, width, height) {
    return {
        top,
        left,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => { },
    };
}
function makeDroppable(id, rect) {
    const el = {
        getBoundingClientRect: () => rect,
    };
    return { id, element: el };
}
describe('adaptCollisionDetection (svelte)', () => {
    it('converts droppables to candidates and returns mapped results', () => {
        const coreDetector = vi.fn(() => [
            { id: 'zone-1', value: 10, left: 0 },
        ]);
        const detect = adaptCollisionDetection(coreDetector);
        const droppable = makeDroppable('zone-1', makeDOMRect(0, 0, 100, 50));
        const result = detect({
            droppables: [droppable],
            dragOperation: { position: { current: { x: 50, y: 25 } } },
        });
        expect(coreDetector).toHaveBeenCalledWith([{ id: 'zone-1', rect: { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 } }], { top: 25, left: 50, width: 1, height: 1, right: 51, bottom: 26 });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('zone-1');
        expect(result[0].droppable).toBe(droppable);
    });
    it('returns empty array when no pointer position', () => {
        const coreDetector = vi.fn();
        const detect = adaptCollisionDetection(coreDetector);
        const result = detect({
            droppables: [],
            dragOperation: { position: { current: null } },
        });
        expect(result).toEqual([]);
        expect(coreDetector).not.toHaveBeenCalled();
    });
    it('handles empty droppables list', () => {
        const coreDetector = vi.fn(() => []);
        const detect = adaptCollisionDetection(coreDetector);
        const result = detect({
            droppables: [],
            dragOperation: { position: { current: { x: 0, y: 0 } } },
        });
        expect(result).toEqual([]);
    });
    it('skips droppables without elements', () => {
        const coreDetector = vi.fn(() => []);
        const detect = adaptCollisionDetection(coreDetector);
        const withEl = makeDroppable('z1', makeDOMRect(0, 0, 50, 50));
        const withoutEl = { id: 'z2', element: null };
        detect({
            droppables: [withEl, withoutEl],
            dragOperation: { position: { current: { x: 0, y: 0 } } },
        });
        expect(coreDetector).toHaveBeenCalledWith([expect.objectContaining({ id: 'z1' })], expect.any(Object));
    });
});
