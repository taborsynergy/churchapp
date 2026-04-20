import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://gracecommunity.church';
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/sermons`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/groups`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/give`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/prayer`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/announcements`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
