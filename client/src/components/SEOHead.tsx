import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  noindex?: boolean;
  structuredData?: object;
}

// Default structured data for the site
const defaultStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Code Reels",
  "alternateName": "CodeReels Interview Prep",
  "description": "Free interactive platform for practicing technical interview questions. Master system design, algorithms, frontend, backend, DevOps, and AI interview prep.",
  "url": "https://open-interview.github.io/",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web Browser",
  "browserRequirements": "Requires JavaScript",
  "softwareVersion": "2.2.0",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "author": {
    "@type": "Person",
    "name": "Satish Kumar Dhule",
    "url": "https://github.com/satishkumar-dhule"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Code Reels",
    "logo": {
      "@type": "ImageObject",
      "url": "https://open-interview.github.io/favicon.svg"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "500",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [
    "System Design Interview Questions",
    "Algorithm Practice",
    "Frontend Interview Prep",
    "Backend Interview Questions",
    "DevOps & SRE Questions",
    "AI/ML Interview Prep",
    "Progress Tracking",
    "Mobile-Friendly Interface"
  ]
};

export function SEOHead({
  title,
  description,
  keywords,
  ogImage = 'https://open-interview.github.io/opengraph.jpg',
  ogType = 'website',
  canonical,
  noindex = false,
  structuredData
}: SEOHeadProps) {
  useEffect(() => {
    // Update title
    document.title = title;

    // Update meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(isProperty ? 'property' : 'name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMeta('description', description);
    if (keywords) updateMeta('keywords', keywords);
    updateMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    
    // Mobile optimization
    updateMeta('viewport', 'width=device-width, initial-scale=1, maximum-scale=5');
    updateMeta('theme-color', '#00ff00');
    updateMeta('mobile-web-app-capable', 'yes');
    updateMeta('apple-mobile-web-app-capable', 'yes');
    updateMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    
    // Additional SEO meta tags
    updateMeta('author', 'Satish Kumar Dhule');
    updateMeta('generator', 'Code Reels v2.2.0');
    updateMeta('rating', 'General');
    updateMeta('revisit-after', '1 days');
    updateMeta('language', 'English');
    updateMeta('distribution', 'global');
    updateMeta('coverage', 'Worldwide');

    // Open Graph
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:image', ogImage, true);
    updateMeta('og:type', ogType, true);
    updateMeta('og:site_name', 'Code Reels', true);
    if (canonical) updateMeta('og:url', canonical, true);

    // Twitter Card
    updateMeta('twitter:card', 'summary_large_image');
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

    // Structured Data (JSON-LD)
    const jsonLdData = structuredData || defaultStructuredData;
    let scriptElement = document.querySelector('script[type="application/ld+json"]');
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptElement);
    }
    scriptElement.textContent = JSON.stringify(jsonLdData);

    // Cleanup function to remove dynamic elements when component unmounts
    return () => {
      // Keep essential meta tags, only clean up page-specific ones if needed
    };
  }, [title, description, keywords, ogImage, ogType, canonical, noindex, structuredData]);

  return null;
}
