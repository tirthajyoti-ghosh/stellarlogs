import type { SystemContent } from './types'

export const READING: SystemContent = {
  id: 'current-reads',
  name: 'Current Reading',
  starColor: '#FF33F6',
  overview: "Books I'm currently reading or have recently finished.",
  items: [
    { title: 'We Are Bob (Bobiverse)', subtitle: 'Dennis E. Taylor', overview: 'March 2025 · Currently reading' },
    { title: 'Artemis', subtitle: 'Andy Weir', overview: 'February 2025' },
    { title: 'Project Hail Mary', subtitle: 'Andy Weir', overview: 'October 2024' },
  ],
}

export const SHOWS: SystemContent = {
  id: 'shows',
  name: 'TV Shows',
  starColor: '#33FFF3',
  overview: "Shows I'm watching and recommend, with thoughts and reviews.",
  items: [
    { title: 'Modern Family', overview: 'November 2024' },
    { title: 'F.R.I.E.N.D.S', overview: 'January 2025' },
    { title: 'The Mentalist', overview: 'March 2025' },
    { title: 'The Orville', overview: 'April 2025' },
  ],
}
