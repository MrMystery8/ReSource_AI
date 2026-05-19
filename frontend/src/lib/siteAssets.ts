const DEFAULT_SITE_LOGO_URL = '/site-logo.png';

export const SITE_LOGO_URL = import.meta.env.VITE_SITE_LOGO_URL ?? DEFAULT_SITE_LOGO_URL;

function ensureLink(
  selector: string,
  create: () => HTMLLinkElement
): HTMLLinkElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const existing = document.querySelector<HTMLLinkElement>(selector);
  if (existing) {
    return existing;
  }

  const created = create();
  document.head.appendChild(created);
  return created;
}

export function syncSiteFavicons(url: string = SITE_LOGO_URL): void {
  if (typeof document === 'undefined') {
    return;
  }

  const iconLinks = [
    {
      selector: 'link[rel="icon"][data-site-logo="true"]',
      create: () => {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.setAttribute('data-site-logo', 'true');
        return link;
      },
    },
    {
      selector: 'link[rel="shortcut icon"][data-site-logo="true"]',
      create: () => {
        const link = document.createElement('link');
        link.rel = 'shortcut icon';
        link.type = 'image/png';
        link.setAttribute('data-site-logo', 'true');
        return link;
      },
    },
    {
      selector: 'link[rel="apple-touch-icon"][data-site-logo="true"]',
      create: () => {
        const link = document.createElement('link');
        link.rel = 'apple-touch-icon';
        link.setAttribute('data-site-logo', 'true');
        return link;
      },
    },
  ] as const;

  for (const { selector, create } of iconLinks) {
    const link = ensureLink(selector, create);
    if (!link) continue;
    link.href = url;
  }
}
