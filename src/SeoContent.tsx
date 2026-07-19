import { WORK } from './content/work'
import { PROJECTS } from './content/projects'
import { BLOG } from './content/blog'
import { RECOMMENDATIONS } from './content/recommendations'
import { READING, SHOWS } from './content/personal'
import { TRAVEL } from './content/travel'
import { CONTACT } from './content/contact'
import type { SystemContent } from './content/types'

const SECTIONS: SystemContent[] = [WORK, PROJECTS, BLOG, RECOMMENDATIONS, READING, SHOWS, TRAVEL, CONTACT]

/**
 * Visually-hidden semantic mirror of the in-world content so crawlers and
 * screen readers get the full portfolio even though the experience renders
 * in WebGL. Single source of truth: the same content modules as the scene.
 */
export function SeoContent() {
  return (
    <section className="seo-mirror" aria-label="Portfolio content">
      <h1>Tirthajyoti (Tirtha) Ghosh — Senior AI Engineer</h1>
      <p>
        Senior AI Engineer with 6+ years of experience. Built 30+ production AI agents for
        enterprise clients, a custom agent loop engine, and a production observability platform.
        Python, FastAPI, PostgreSQL, TypeScript, React.
      </p>
      {SECTIONS.map((section) => (
        <article key={section.id}>
          <h2>{section.name}</h2>
          <p>{section.overview}</p>
          {section.items.map((item, i) => (
            <div key={i}>
              <h3>{item.title}</h3>
              {item.subtitle && <p>{item.subtitle}</p>}
              {item.tech && <p>Technologies: {item.tech}</p>}
              {item.overview && <p>{item.overview}</p>}
              {item.body && <p>{item.body}</p>}
              {item.bullets && (
                <ul>
                  {item.bullets.map((bullet, j) => (
                    <li key={j}>{bullet}</li>
                  ))}
                </ul>
              )}
              {item.links && (
                <ul>
                  {item.links.map((link, j) => (
                    <li key={j}>
                      <a href={link.url}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </article>
      ))}
      <p>
        Spaceship model:{' '}
        <a href="https://sketchfab.com/3d-models/mcrn-tachi-expanse-tv-show-76fc983ab08c449b9042491a00e621cf">
          "MCRN Tachi [Expanse TV Show]"
        </a>{' '}
        by Jakub.Vildomec, licensed under{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
      </p>
    </section>
  )
}
