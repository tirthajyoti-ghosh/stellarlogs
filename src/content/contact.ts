import type { SystemContent } from './types'

/** New in the 3D rebuild — the 2D site had no contact surface at all. */
export const CONTACT: SystemContent = {
  id: 'contact',
  name: 'Comms Station',
  starColor: '#7FFFD4',
  overview: 'Get in touch — comms array for hails, transmissions, and collaboration requests.',
  items: [
    {
      title: 'Tirthajyoti (Tirtha) Ghosh',
      subtitle: 'Senior AI Engineer · 6+ years experience',
      body: 'Built 30+ production AI agents for enterprise clients, a custom agent loop engine, and a production observability platform.',
      links: [
        { label: '✉ itirthahere@gmail.com', url: 'mailto:itirthahere@gmail.com' },
        { label: 'GitHub — tirthajyoti-ghosh', url: 'https://github.com/tirthajyoti-ghosh' },
        { label: 'Blog — tghosh.hashnode.dev', url: 'https://tghosh.hashnode.dev' },
      ],
    },
  ],
}
