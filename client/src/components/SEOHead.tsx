import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  keywords,
  ogImage = 'https://reel-interview.github.io/opengraph.jpg',
  ogType = 'website',
  canonical,
  noindex = false
}: SEOHeadProps) {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      let element = document.querySelector(`meta[${isProperty ? 'property' : 'name'}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(isProperty ? 'property' : 'name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('description', description);
    if (keywords) updateMeta('keywords', keywords);
    if (noindex) updateMeta('robots', 'noindex, nofollow');

    // Open Graph
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:image', ogImage, true);
    updateMeta('og:type', ogType, true);

    // Twitter
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', ogImage);

    // Canonical URL
    if (canonical) {
      let canonicalElement = document.querySelector('link[rel="canonical"]');
      if (!canonicalElement) {
        canonicalElement = document.createElement('link');
        canonicalElement.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalElement);
      }
      canonicalElement.setAttribute('href', canonical);
    }
  }, [title, description, keywords, ogImage, ogType, canonical, noindex]);

  return null;
}
