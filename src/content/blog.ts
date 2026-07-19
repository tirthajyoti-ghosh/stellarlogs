import type { SystemContent } from './types'

export const BLOG: SystemContent = {
  id: 'blog',
  name: 'Blog',
  starColor: '#F6F0A3',
  overview: "Articles and thoughts I've published about technology.",
  items: [
    {
      title: 'An in-depth look at closures in React',
      subtitle: 'Published: January 18, 2024',
      overview: 'Under-the-hood look at closures in React.',
      body: "In JavaScript, a closure is created when a function retains access to its lexical scope, even when executed outside of that scope. In React, closures often appear in event handlers, effects, and asynchronous operations. However, due to React's rendering behavior, these closures can sometimes capture stale state or props, leading to bugs.",
      links: [
        {
          label: 'Read the full article →',
          url: 'https://tghosh.hashnode.dev/an-in-depth-look-at-closures-in-react',
        },
      ],
    },
    {
      title: 'Rendering Large Lists in Vanilla JS: List Virtualization',
      subtitle: 'Published: January 25, 2024',
      overview: 'An in-depth look at list virtualization and its benefits.',
      body: 'Rendering extensive lists (e.g., 10,000 items) by creating a DOM node for each item can severely impact performance. Even dynamically adding and removing nodes during scrolling can lead to lag due to the heavy nature of DOM operations and unpredictable user scroll behavior. Enter list virtualization.',
      links: [
        {
          label: 'Read the full article →',
          url: 'https://tghosh.hashnode.dev/rendering-large-lists-in-vanilla-js-list-virtualization',
        },
      ],
    },
    {
      title: 'How To Use CSS Sprites: An Ingenious Way of Reducing Page Loading time',
      subtitle: 'Published: February 20, 2020',
      overview: 'An in-depth guide on using CSS sprites to optimize web performance.',
      body: "Imagine you have six images on your home page. You might proceed with loading the images separately. After all, they are six different images and to be used in six different places. And you might be right ... from your perspective. You also know that loading six different images will force the browser to make six different HTTP requests to the server. And each time it makes a request, a few milliseconds gets added to your page loading time. That's bad news if you have fifty images.",
      links: [
        {
          label: 'Read the full article →',
          url: 'https://hackernoon.com/how-to-use-css-sprites-an-ingenious-way-of-reducing-page-loading-time-c72u37yk',
        },
      ],
    },
  ],
}
