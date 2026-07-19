/** Typed portfolio content — single source of truth for the 3D world and the
 * hidden SEO mirror. Ported verbatim from the 2D site's js/content.js. */

export interface ContentLink {
  label: string
  url: string
}

export interface ContentImage {
  url: string
  caption?: string
}

export interface ContentItem {
  /** Planet display name */
  title: string
  /** Company / date / period line */
  subtitle?: string
  /** Technologies line */
  tech?: string
  /** Short overview shown on the title board */
  overview?: string
  /** Long-form paragraphs (project description, article excerpt, quote) */
  body?: string
  /** Achievement bullet points */
  bullets?: string[]
  links?: ContentLink[]
  images?: ContentImage[]
}

export interface SystemContent {
  id: string
  name: string
  starColor: string
  overview: string
  items: ContentItem[]
}
