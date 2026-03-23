import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractLogo } from './llm';
import { USER_AGENTS } from '@/lib/constant';

const getHeaders = () => ({
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
});

const BANNER_KEYWORDS = ['ogimage', 'og-image', 'blogheader', 'newsletter', 'social', 'banner', 'hero', 'cover', 'thumbnail'];

const isBanner = (url: string): boolean => {
    const lower = url.toLowerCase();
    return BANNER_KEYWORDS.some((kw) => lower.includes(kw));
};

const toAbsolute = (href: string, homePage: string): string => {
    if (!href) return '';
    if (href.startsWith('http') || href.startsWith('data:')) return href;
    return `${homePage}${href.startsWith('/') ? '' : '/'}${href}`;
};

type LogoResult = { logo: string; source: string } | null;

// --- Strategy 1: JSON-LD ---
const fetchLogoFromJsonLd = ($: cheerio.CheerioAPI): LogoResult => {
    const scripts = $('script[type="application/ld+json"]');
    if (!scripts.length) return null;

    for (const el of scripts.toArray()) {
        try {
            const json = JSON.parse($(el).html() ?? '');
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
                if (item.logo) {
                    const logo = typeof item.logo === 'string' ? item.logo : item.logo?.url;
                    if (logo && !isBanner(logo)) return { logo, source: 'json-ld' };
                }
            }
        } catch (_) { }
    }
    return null;
};

// --- Strategy 2: Schema.org microdata ---
const fetchLogoFromSchemaOrgMicrodata = ($: cheerio.CheerioAPI, homePage: string): LogoResult => {
    const imgSrc = $('img[itemprop="logo"]').first().attr('src');
    if (imgSrc) {
        const logo = toAbsolute(imgSrc, homePage);
        if (logo && !isBanner(logo)) return { logo, source: 'schema-microdata-img' };
    }

    const metaContent = $('meta[itemprop="logo"]').first().attr('content')
        ?? $('link[itemprop="logo"]').first().attr('href');
    if (metaContent) {
        const logo = toAbsolute(metaContent, homePage);
        if (logo && !isBanner(logo)) return { logo, source: 'schema-microdata-meta' };
    }

    return null;
};

// --- Strategy 3: Logo attributes (class/id/alt) ---
const fetchLogoFromLogoAttributes = ($: cheerio.CheerioAPI, homePage: string): LogoResult => {
    const selectors = [
        'img[class*="logo" i]',
        'img[id*="logo" i]',
        'img[alt*="logo" i]',
        'a[class*="logo" i] img',
        'a[id*="logo" i] img',
        'div[class*="logo" i] img',
        'div[id*="logo" i] img',
    ];

    for (const selector of selectors) {
        const el = $(selector).first();
        const src = el.attr('src') ?? '';
        if (!src) continue;
        const logo = toAbsolute(src, homePage);
        if (logo && !isBanner(logo)) return { logo, source: `logo-attribute:${selector}` };
    }

    return null;
};

// --- Strategy 4: Inline SVG ---
const fetchLogoFromInlineSvg = ($: cheerio.CheerioAPI): LogoResult => {
    const svgEl = $('[class*="logo" i] svg, [id*="logo" i] svg, a[href="/"] svg').first();
    if (!svgEl.length) return null;

    const svgHtml = $.html(svgEl);
    if (!svgHtml) return null;

    const hasViewBox = svgEl.attr('viewBox') ?? svgEl.attr('viewbox');
    if (!hasViewBox) return null;

    const viewBoxParts = hasViewBox.split(/[\s,]+/).map(Number);
    if (viewBoxParts.length === 4) {
        const [, , w, h] = viewBoxParts;
        if (h > 0 && w / h < 1.2) return null;
        if (w < 40 || h < 10) return null;
    }

    const logo = `data:image/svg+xml;base64,${Buffer.from(svgHtml).toString('base64')}`;
    return { logo, source: 'inline-svg' };
};

// --- Strategy 5: SVG favicon ---
const fetchLogoFromSvgFavicon = ($: cheerio.CheerioAPI, homePage: string): LogoResult => {
    const href = $('link[rel="icon"], link[rel="shortcut icon"]')
        .filter((_, el) => {
            const h = $(el).attr('href') ?? '';
            const type = $(el).attr('type') ?? '';
            return type === 'image/svg+xml' || h.endsWith('.svg');
        })
        .first()
        .attr('href');

    if (!href) return null;
    const logo = toAbsolute(href, homePage);
    return { logo, source: 'svg-favicon' };
};

// --- Strategy 6: mask-icon ---
const fetchLogoFromMaskIcon = ($: cheerio.CheerioAPI, homePage: string): LogoResult => {
    const href = $('link[rel="mask-icon"]').first().attr('href');
    if (!href) return null;
    const logo = toAbsolute(href, homePage);
    return { logo, source: 'mask-icon' };
};

// --- Strategy 7: Apple touch icon ---
const fetchLogoFromAppleTouchIcon = ($: cheerio.CheerioAPI, homePage: string): LogoResult => {
    const href = $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]')
        .first()
        .attr('href');
    if (!href) return null;
    const logo = toAbsolute(href, homePage);
    return { logo, source: 'apple-touch-icon' };
};

// --- Strategy 8: Web App Manifest ---
const fetchLogoFromWebManifest = async ($: cheerio.CheerioAPI, homePage: string): Promise<LogoResult> => {
    const manifestHref = $('link[rel="manifest"]').first().attr('href');
    if (!manifestHref) return null;

    const manifestUrl = toAbsolute(manifestHref, homePage);
    try {
        const { data } = await axios.get(manifestUrl, {
            timeout: 8000,
            headers: getHeaders(),
        });
        const icons: { src: string; sizes?: string; purpose?: string }[] = data?.icons ?? [];
        if (!icons.length) return null;

        const sorted = icons
            .filter((i) => !i.purpose || i.purpose.includes('any'))
            .sort((a, b) => {
                const sizeA = parseInt((a.sizes ?? '0x0').split('x')[0], 10);
                const sizeB = parseInt((b.sizes ?? '0x0').split('x')[0], 10);
                return sizeB - sizeA;
            });

        const best = sorted[0];
        if (!best) return null;

        const logo = toAbsolute(best.src, homePage);
        return { logo, source: 'web-manifest' };
    } catch (_) {
        return null;
    }
};

// --- Strategy 9: WordPress REST API ---
const fetchLogoFromWordPress = async (homePage: string): Promise<LogoResult> => {
    try {
        const { data: settings } = await axios.get(`${homePage}/wp-json/v2/settings`, {
            timeout: 8000,
            headers: getHeaders(),
            validateStatus: (s) => s === 200,
        });

        const logoId = settings?.site_logo ?? settings?.custom_logo;
        if (!logoId) return null;

        const { data: media } = await axios.get(`${homePage}/wp-json/v2/media/${logoId}`, {
            timeout: 8000,
            headers: getHeaders(),
            validateStatus: (s) => s === 200,
        });

        const logo = media?.source_url ?? media?.guid?.rendered;
        if (!logo) return null;

        return { logo, source: 'wordpress-api' };
    } catch (_) {
        return null;
    }
};

// --- Strategy 10: Common well-known paths ---
const fetchLogoFromCommonPaths = async (homePage: string): Promise<LogoResult> => {
    const paths = [
        '/logo.svg', '/logo.png', '/logo.webp',
        '/images/logo.svg', '/images/logo.png',
        '/assets/logo.svg', '/assets/logo.png',
        '/img/logo.svg', '/img/logo.png',
        '/static/logo.svg', '/static/logo.png',
        '/public/logo.svg', '/public/logo.png',
        '/brand/logo.svg', '/brand/logo.png',
        '/favicon.svg',
    ];

    const results = await Promise.all(
        paths.map(async (path) => {
            const url = `${homePage}${path}`;
            try {
                const response = await axios.head(url, {
                    timeout: 8000,
                    headers: getHeaders(),
                    validateStatus: () => true,
                });
                const contentType = response.headers['content-type'] ?? '';
                return response.status === 200 && contentType.startsWith('image/') ? url : null;
            } catch (_) {
                return null;
            }
        })
    );

    const logo = results.find(Boolean) ?? null;
    return logo ? { logo, source: 'common-path' } : null;
};

// --- Strategy 11: logo.dev ---
const fetchLogoFromLogoDev = async (hostname: string): Promise<LogoResult> => {
    const apiKey = process.env.LOGO_DEV_API_KEY;
    if (!apiKey) return null;

    const url = `https://img.logo.dev/${hostname}?token=${apiKey}`;
    try {
        const response = await axios.head(url, {
            timeout: 8000,
            validateStatus: () => true,
        });
        if (response.status === 200) {
            return { logo: url, source: 'logo.dev' };
        }
    } catch (_) { }
    return null;
};

// --- Strategy 12: AI fallback ---
const logoLikelihoodScore = (src: string, alt: string, cls: string, id: string, parentTag: string): number => {
    let score = 0;
    const combined = `${src} ${alt} ${cls} ${id}`.toLowerCase();

    if (combined.includes('logo')) score += 10;
    if (combined.includes('brand')) score += 6;
    if (combined.includes('wordmark')) score += 8;
    if (['header', 'nav'].includes(parentTag)) score += 5;
    if (src.endsWith('.svg') || src.includes('.svg?')) score += 6;
    if (combined.includes('banner')) score -= 8;
    if (combined.includes('hero')) score -= 6;
    if (combined.includes('background')) score -= 5;
    if (combined.includes('avatar') || combined.includes('profile') || combined.includes('user')) score -= 4;
    if (combined.includes('icon') && !combined.includes('logo')) score -= 2;
    if (src.startsWith('data:')) score -= 3;

    return score;
};

const fetchLogoFromAi = async ($: cheerio.CheerioAPI, homePage: string): Promise<LogoResult> => {
    type ImageCandidate = { src: string; alt: string; class: string; id: string; parentTag: string; score: number };

    const seen = new Set<string>();
    const candidates: ImageCandidate[] = [];

    $('img').each((_, el) => {
        const src = $(el).attr('src') ?? '';
        if (!src) return;
        const absoluteSrc = toAbsolute(src, homePage);
        if (!absoluteSrc || seen.has(absoluteSrc)) return;
        seen.add(absoluteSrc);

        const alt = $(el).attr('alt') ?? '';
        const cls = $(el).attr('class') ?? '';
        const id = $(el).attr('id') ?? '';
        const parentTag = $(el).parent().prop('tagName')?.toLowerCase() ?? '';
        const score = logoLikelihoodScore(absoluteSrc, alt, cls, id, parentTag);

        candidates.push({ src: absoluteSrc, alt, class: cls, id, parentTag, score });
    });

    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length) return null;

    const payload = candidates.slice(0, 100).map(({ src, alt, class: cls, id, parentTag }) => ({
        src, alt, class: cls, id, parentTag,
    }));

    const result = await extractLogo(payload);
    if (result && result !== 'null') {
        return { logo: result, source: 'ai' };
    }
    return null;
};

// --- Race helper ---
const raceFirst = (promises: Promise<LogoResult>[]): Promise<LogoResult> => {
    return new Promise((resolve) => {
        let settled = 0;
        const total = promises.length;
        if (total === 0) { resolve(null); return; }

        promises.forEach((p) =>
            p.then((result) => {
                if (result) resolve(result);
                else if (++settled === total) resolve(null);
            }).catch(() => {
                if (++settled === total) resolve(null);
            })
        );
    });
};

// --- Main ---
export const fetchLogo = async (
    link: string
): Promise<{ success: boolean; logo: string | null; source: string | null; error: string | null }> => {
    let url: URL;
    try {
        url = new URL(link.startsWith('http') ? link : `https://${link}`);
    } catch (_) {
        return { success: false, logo: null, source: null, error: 'Invalid URL' };
    }

    if (!url.hostname.includes('.')) {
        return { success: false, logo: null, source: null, error: 'Invalid URL' };
    }

    try {
        const homePage = `${url.protocol}//${url.hostname}`;
        const safe = (p: Promise<LogoResult>): Promise<LogoResult> => p.catch(() => null);

        let $: cheerio.CheerioAPI | null = null;

        try {
            const { data: html } = await axios.get(homePage, {
                timeout: 15000,
                headers: getHeaders(),
            });
            $ = cheerio.load(html);
        } catch (_) { }

        if ($) {
            const syncResult =
                fetchLogoFromJsonLd($) ??
                fetchLogoFromSchemaOrgMicrodata($, homePage) ??
                fetchLogoFromLogoAttributes($, homePage) ??
                fetchLogoFromInlineSvg($) ??
                fetchLogoFromSvgFavicon($, homePage) ??
                fetchLogoFromMaskIcon($, homePage) ??
                fetchLogoFromAppleTouchIcon($, homePage) ??
                null;

            if (syncResult) return { success: true, logo: syncResult.logo, source: syncResult.source, error: null };
        }

        const asyncStrategies: Promise<LogoResult>[] = [
            safe(fetchLogoFromLogoDev(url.hostname)),
            safe(fetchLogoFromCommonPaths(homePage)),
            ...($
                ? [
                    safe(fetchLogoFromWebManifest($, homePage)),
                    safe(fetchLogoFromWordPress(homePage)),
                ]
                : []
            ),
        ];

        const asyncResult = await raceFirst(asyncStrategies);
        if (asyncResult) return { success: true, logo: asyncResult.logo, source: asyncResult.source, error: null };

        if ($) {
            const result = await fetchLogoFromAi($, homePage);
            if (result) return { success: true, logo: result.logo, source: result.source, error: null };
        }

        return { success: false, logo: null, source: null, error: 'No logo found.' };
    } catch (err) {
        if (axios.isAxiosError(err)) {
            return {
                success: false,
                logo: null,
                source: null,
                error: `Something went wrong!${err.response?.status ? ` [${err.response?.status}]` : ''}`,
            };
        }
        return { success: false, logo: null, source: null, error: (err as Error).message };
    }
};