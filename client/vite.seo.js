import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SITE_URL = (process.env.SITE_URL || 'https://codenames.codes').replace(/\/$/, '');

export function robotsBody(origin = SITE_URL) {
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /stats',
    'Disallow: /api/',
    'Disallow: /*?*room=',
    '',
    'User-agent: GPTBot',
    'Allow: /',
    'Allow: /stats',
    'Disallow: /api/',
    'Disallow: /*?*room=',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    'Allow: /stats',
    'Disallow: /api/',
    'Disallow: /*?*room=',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function sitemapBody(origin = SITE_URL) {
  const now = new Date().toISOString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${origin}/</loc>`,
    `    <lastmod>${now}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '  <url>',
    `    <loc>${origin}/stats</loc>`,
    `    <lastmod>${now}</lastmod>`,
    '    <changefreq>hourly</changefreq>',
    '    <priority>0.4</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}

/** Serves robots.txt and sitemap.xml, and writes absolute copies on build. */
export function seoFilesPlugin() {
  return {
    name: 'seo-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if ((req.method === 'GET' || req.method === 'HEAD') && (path === '/stats' || path === '/stats/')) {
          req.url = '/stats.html';
          return next();
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        if (path === '/robots.txt') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.end(robotsBody());
          return;
        }
        if (path === '/sitemap.xml') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.end(sitemapBody());
          return;
        }
        next();
      });
    },
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist');
      writeFileSync(resolve(outDir, 'robots.txt'), robotsBody());
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemapBody());
    },
  };
}
