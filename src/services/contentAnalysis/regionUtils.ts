import type { SourceRegion } from '../../types/content'

export function intersectionOverUnion(a: SourceRegion, b: SourceRegion) {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)
  const union = a.width * a.height + b.width * b.height - intersection
  return union > 0 ? intersection / union : 0
}

export function clampRegion(region: SourceRegion): SourceRegion {
  const x = Math.min(1, Math.max(0, region.x))
  const y = Math.min(1, Math.max(0, region.y))
  return {
    x,
    y,
    width: Math.min(1 - x, Math.max(0.01, region.width)),
    height: Math.min(1 - y, Math.max(0.01, region.height)),
  }
}
