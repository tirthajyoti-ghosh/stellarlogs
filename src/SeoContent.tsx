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
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Space station model:{' '}
        <a href="https://sketchfab.com/3d-models/gateway-57c6a27313794618a299ebe9ec8c2afd">"Gateway"</a> by
        andreas9343 (CC BY 4.0). Asteroid models:{' '}
        <a href="https://sketchfab.com/3d-models/asteroids-pack-metallic-version-eff495d9315c47dbb2777ec80bef40d8">
          "Asteroids Pack (metallic version)"
        </a>{' '}
        by SebastianSosnowski (CC BY 4.0). Torpedo model from{' '}
        <a href="https://sketchfab.com/3d-models/low-poly-missiles-and-torpedos-99783c90ce904951a3c71e851a527d35">
          "Low Poly Missiles and Torpedos"
        </a>{' '}
        by sakigakefuruzawa (CC BY 4.0). Explosion animation by{' '}
        <a href="https://opengameart.org/content/wgstudio-explosion-animation">WrathGames Studio</a>{' '}
        (OpenGameArt, CC BY 3.0). Nebula imagery courtesy of{' '}
        <a href="https://esahubble.org">ESA/Hubble</a> (NASA, ESA — CC BY 4.0). Milky Way sky from{' '}
        <a href="https://svs.gsfc.nasa.gov/4851">NASA/Goddard SVS "Deep Star Maps 2020"</a> (public
        domain).
      </p>
    </section>
  )
}
