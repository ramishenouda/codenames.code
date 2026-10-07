import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function originFromReq(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5173';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
}

export function robotsBody(origin) {
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

export function sitemapBody(origin) {
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

/** Serves host-aware robots.txt and sitemap.xml in Vite, and writes absolute copies on build. */
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
          const body = robotsBody(originFromReq(req));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.end(body);
          return;
        }
        if (path === '/sitemap.xml') {
          const body = sitemapBody(originFromReq(req));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.end(body);
          return;
        }
        next();
      });
    },
    closeBundle() {
      const origin = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
      const outDir = resolve(process.cwd(), 'dist');
      writeFileSync(resolve(outDir, 'robots.txt'), robotsBody(origin));
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemapBody(origin));
    },
  };
}
