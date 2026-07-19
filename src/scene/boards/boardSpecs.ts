import type { ContentImage, ContentItem, ContentLink } from '../../content/types'

/**
 * Pure layout pass: converts a content item into positioned billboard specs.
 * All sizes in world units; text Y offsets are measured from board center.
 */

export interface TextBlock {
  text: string
  size: number
  color: string
  y: number
  maxWidth: number
  bold?: boolean
}

export interface LinkButton {
  link: ContentLink
  y: number
  width: number
  height: number
}

export interface BoardSpec {
  width: number
  height: number
  blocks: TextBlock[]
  buttons: LinkButton[]
  image?: ContentImage
  /** Image plane height (width is fixed by the board) */
  imageHeight?: number
}

const GAP = 2.5
const PAD = 7

interface PendingBlock {
  text: string
  size: number
  color: string
  lineChars: number
  bold?: boolean
}

function blockHeight(b: PendingBlock): number {
  const lines = Math.max(1, Math.ceil(b.text.length / b.lineChars))
  return lines * b.size * 1.32
}

function layout(width: number, pending: PendingBlock[], links: ContentLink[]): BoardSpec {
  const heights = pending.map(blockHeight)
  const linksHeight = links.length * 8.5
  const height =
    PAD + heights.reduce((a, b) => a + b + GAP, 0) + (links.length ? linksHeight + GAP : 0) + PAD

  const blocks: TextBlock[] = []
  let y = height / 2 - PAD
  pending.forEach((b, i) => {
    blocks.push({
      text: b.text,
      size: b.size,
      color: b.color,
      y,
      maxWidth: width - PAD * 2,
      bold: b.bold,
    })
    y -= heights[i] + GAP
  })

  const buttons: LinkButton[] = links.map((link, i) => ({
    link,
    y: y - i * 8.5 - 3.5,
    width: width - PAD * 2,
    height: 7,
  }))

  return { width, height, blocks, buttons }
}

const TITLE = '#ffffff'
const SUBTITLE = '#93a8c4'
const TECH = '#7fd4ff'
const BODY = '#d5e0ee'

/** Boards for one planet's content item, tinted by its system color. */
export function buildBoards(item: ContentItem, systemColor: string): BoardSpec[] {
  const boards: BoardSpec[] = []
  const isCompact = !item.bullets && !item.body && !item.tech

  // Main board: title, subtitle, tech, overview/body, links
  {
    const width = isCompact ? 70 : 92
    const pending: PendingBlock[] = [
      { text: item.title, size: isCompact ? 5.2 : 5.6, color: TITLE, lineChars: 24, bold: true },
    ]
    if (item.subtitle) pending.push({ text: item.subtitle, size: 3.5, color: systemColor, lineChars: 40 })
    if (item.tech) pending.push({ text: item.tech, size: 3.0, color: TECH, lineChars: 52 })
    const prose = item.overview ?? ''
    if (prose) pending.push({ text: prose, size: 3.2, color: BODY, lineChars: 46 })
    boards.push(layout(width, pending, item.links ?? []))
  }

  // Long-form body (project description, article excerpt, testimonial quote)
  if (item.body) {
    boards.push(
      layout(96, [{ text: item.body, size: 3.1, color: BODY, lineChars: 52 }], []),
    )
  }

  // Achievement bullets, three per board
  if (item.bullets) {
    for (let i = 0; i < item.bullets.length; i += 3) {
      const chunk = item.bullets.slice(i, i + 3)
      const pending: PendingBlock[] = chunk.map((b) => ({
        text: `▸ ${b}`,
        size: 3.0,
        color: BODY,
        lineChars: 54,
      }))
      const total = Math.ceil(item.bullets.length / 3)
      if (total > 1) {
        pending.unshift({
          text: `Highlights ${i / 3 + 1}/${total}`,
          size: 3.2,
          color: systemColor,
          lineChars: 40,
          bold: true,
        })
      }
      boards.push(layout(96, pending, []))
    }
  }

  // Photo boards with captions
  for (const image of item.images ?? []) {
    const width = 72
    const imageHeight = 46
    const captionBlocks: TextBlock[] = image.caption
      ? [
          {
            text: image.caption,
            size: 2.7,
            color: SUBTITLE,
            y: -imageHeight / 2 - 3,
            maxWidth: width - 8,
          },
        ]
      : []
    boards.push({
      width,
      height: imageHeight + (image.caption ? 14 : 6),
      blocks: captionBlocks,
      buttons: [],
      image,
      imageHeight,
    })
  }

  return boards
}
