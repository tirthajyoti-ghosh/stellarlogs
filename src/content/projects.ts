import type { SystemContent } from './types'

export const PROJECTS: SystemContent = {
  id: 'projects',
  name: 'Projects',
  starColor: '#5CAFFB',
  overview: "A collection of personal and professional projects I've built throughout my career.",
  items: [
    {
      title: 'The Feed — AI Learning App',
      subtitle: '2026',
      tech: 'Python, FastAPI, SQLite, networkx, Claude API (Opus), React, TypeScript, Vite',
      overview:
        'An AI-native learning app where Claude acts as an adaptive educator with persistent memory, a knowledge graph, and spaced repetition.',
      body: 'A personal learning feed for agentic AI engineering. The educator agent reads its own state between runs, traverses a knowledge graph to find concept gaps, generates content using spaced repetition intervals (modified SM-2), evaluates answers, and writes back what it learned about the learner for the next session. Not a stateless LLM call — an agent with memory and tools.',
      links: [{ label: 'GitHub repository', url: 'https://github.com/tirthajyoti-ghosh/the-feed' }],
    },
    {
      title: 'Expo LLM Mediapipe',
      subtitle: 'npm package · 2025',
      tech: 'expo-modules, TypeScript, Kotlin, Swift',
      overview:
        "A powerful and efficient library for running on-device LLM (Large Language Model) inference in Expo applications using Google's MediaPipe LLM Task API.",
      links: [
        { label: 'npm package', url: 'https://www.npmjs.com/package/expo-llm-mediapipe' },
        { label: 'GitHub repository', url: 'https://github.com/tirthajyoti-ghosh/expo-llm-mediapipe' },
      ],
    },
    {
      title: 'Bücherbüchse',
      subtitle: '2022–2023',
      tech: 'React Native, Expo, React Query, TypeScript, REST API, Android, iOS',
      overview:
        'An Instagram-like social media app for book nerds. Built for the German market with React Native, React Query and Typescript.',
      links: [
        {
          label: 'Live on PlayStore',
          url: 'https://play.google.com/store/apps/details?id=app.buecherbuechse.bookbox',
        },
      ],
      images: [{ url: 'https://i.ibb.co/27y46nbq/bookbox.png', caption: 'Bücherbüchse' }],
    },
    {
      title: "PUMA's Employee App CATch Up",
      subtitle: '2022',
      tech: 'React Native, Expo, TypeScript, REST API, Android, iOS',
      overview:
        'A mobile app for PUMA employees to stay up to date with the latest news and events. Built with React Native, Expo and Typescript.',
      links: [
        {
          label: 'Live on PlayStore',
          url: 'https://play.google.com/store/apps/details?id=com.pumacatchup.appV2',
        },
      ],
      images: [{ url: 'https://i.ibb.co/Y4cZmpWB/puma.png', caption: "PUMA CATch Up" }],
    },
    {
      title: 'Amigo',
      subtitle: '2023–2024',
      tech: 'React Native, Expo, TypeScript, React Query, Firebase',
      overview:
        'Next-generation group expense management app for travelers. Built with React Native, Expo and Typescript.',
      links: [{ label: 'GitHub repository', url: 'https://github.com/get-amigo/Amigo' }],
      images: [{ url: 'https://i.ibb.co/s892qKp/amigo.png', caption: 'Amigo' }],
    },
    {
      title: 'Animex',
      subtitle: '2020',
      tech: 'React/Redux, Sass, REST API, React Router, Netlify',
      overview:
        'This is a single page application which allows users to browse and view a catalog of anime series and movies. Built with React/Redux.',
      links: [
        { label: 'Live on Netlify', url: 'https://ghosh-animex.netlify.app/' },
        { label: 'GitHub repository', url: 'https://github.com/tirthajyoti-ghosh/Animex' },
      ],
      images: [{ url: 'https://i.ibb.co/VydFW8v/animex.png', caption: 'Animex' }],
    },
  ],
}
