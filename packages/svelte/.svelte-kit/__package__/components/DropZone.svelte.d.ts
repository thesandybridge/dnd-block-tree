interface Props {
    id: string;
    parentId: string | null;
    onHover: (zoneId: string, parentId: string | null) => void;
    activeId: string | null;
    hoverZone?: string | null;
    height?: number;
    class?: string;
    activeClass?: string;
}
declare const DropZone: import("svelte").Component<Props, {}, "">;
type DropZone = ReturnType<typeof DropZone>;
export default DropZone;
//# sourceMappingURL=DropZone.svelte.d.ts.map