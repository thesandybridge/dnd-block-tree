export interface SensorCallbacks {
  onDragStart(blockId: string, x: number, y: number): void
  onDragMove(x: number, y: number): void
  onDragEnd(x: number, y: number): void
  onDragCancel(): void
}

export interface Sensor {
  attach(container: HTMLElement): void
  detach(): void
}
