export interface Position3D {
  readonly x: number
  readonly y: number
  readonly z: number
}

export function createPosition(x: number, y: number, z: number): Position3D {
  return { x, y, z }
}

export function distanceBetween(a: Position3D, b: Position3D): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
