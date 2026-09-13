import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "What's New — Market Context",
    short_name: "What's New",
    description:
      'Evidence-first market briefings, watchlist updates, and research alerts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07110e',
    theme_color: '#07110e',
    orientation: 'portrait',
    categories: ['finance', 'news', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
