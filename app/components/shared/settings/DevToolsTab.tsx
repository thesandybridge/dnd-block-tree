import { BlockTreeDevTools, type DevToolsEventEntry, type BaseBlock } from 'dnd-block-tree'

interface DevToolsTabProps<T extends BaseBlock = BaseBlock> {
  blocks: T[]
  containerTypes?: readonly string[]
  events: DevToolsEventEntry[]
  onClearEvents: () => void
}

export function DevToolsTab<T extends BaseBlock>({ blocks, containerTypes, events, onClearEvents }: DevToolsTabProps<T>) {
  return (
    <BlockTreeDevTools
      blocks={blocks}
      containerTypes={containerTypes}
      events={events}
      onClearEvents={onClearEvents}
    />
  )
}
