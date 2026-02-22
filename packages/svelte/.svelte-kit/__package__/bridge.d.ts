import type { CoreCollisionDetection } from '@dnd-block-tree/core';
/**
 * Adapt a framework-agnostic CoreCollisionDetection into a @dnd-kit/dom CollisionDetection.
 *
 * @dnd-kit/dom collision detection receives a DragOperation and returns collisions.
 * We bridge by extracting droppable rects and the pointer rect, running the core
 * detector, and mapping results back.
 */
export declare function adaptCollisionDetection(coreDetector: CoreCollisionDetection): (args: {
    droppables: any[];
    dragOperation: any;
}) => any[];
//# sourceMappingURL=bridge.d.ts.map