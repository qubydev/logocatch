import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractLogo } from './llm';
import { USER_AGENTS } from '@/lib/constant';

// --- Logger Utility ---
const log = (message: string) => {
    console.log(`[LogoExtractor] ${message}`);
};

const getHeaders = () => ({
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
});

const isBanner = (url: string) => {
    const keywords = ['ogimage', 'og-image', 'blogheader', 'newsletter', 'social', 'banner', 'hero', 'cover'];
    return keywords.some((kw) => url.toLowerCase().includes(kw));
};

const toAbsolute = (href: string, homePage: string) => {
    if (!href) return '';
    if (href.startsWith('http') || href.startsWith('data:')) return href;
    return `${homePage}${href.startsWith('/') ? '' : '/'}${href}`;
};

// --- 1. Logo.dev API ---
const checkLogoDev = async (hostname: string) => {
    // return null;

    log(`Strategy 1: Checking logo.dev Search API for ${hostname}...`);
    const apiKey = process.env.LOGO_DEV_API_KEY;
    if (!apiKey) {
        log(`Strategy 1 Skipped: LOGO_DEV_API_KEY is missing.`);
        return null;
    }

    const url = `https://api.logo.dev/search?q=${hostname}`;
    try {
        const res = await axios.get(url, {
            timeout: 5000,
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        const results = res.data;
        if (Array.isArray(results) && results.length > 0) {
            const exactMatch = results.find((r: any) => r.domain === hostname) || results[0];

            if (exactMatch && exactMatch.logo_url) {
                log(`Strategy 1 Success: Found valid logo via logo.dev API.`);
                return { logo: exactMatch.logo_url, source: 'logo.dev' };
            }
        }

        log(`Strategy 1 Miss: logo.dev Search API returned no matches.`);
        return null;
    } catch (err: any) {
        log(`Strategy 1 Failed: API request error - ${err.response?.status || err.message}`);
        return null;
    }
};

// --- 2. HTML Meta & Schema Checks ---
const extractFromMeta = ($: cheerio.CheerioAPI, homePage: string) => {
    log(`Strategy 2: Parsing JSON-LD and Schema.org microdata...`);

    const scripts = $('script[type="application/ld+json"]').toArray();
    for (const el of scripts) {
        try {
            const json = JSON.parse($(el).html() ?? '{}');
            const items = Array.isArray(json) ? json : [json];
            for (const item of items) {
                const logo = typeof item.logo === 'string' ? item.logo : item.logo?.url;
                if (logo && !isBanner(logo)) {
                    log(`Strategy 2 Success: Found logo in JSON-LD script tag.`);
                    return { logo: toAbsolute(logo, homePage), source: 'json-ld' };
                }
            }
        } catch { }
    }

    const metaLogo = $('img[itemprop="logo"]').attr('src') || $('meta[itemprop="logo"]').attr('content');
    if (metaLogo && !isBanner(metaLogo)) {
        log(`Strategy 2 Success: Found logo in Schema itemprop.`);
        return { logo: toAbsolute(metaLogo, homePage), source: 'schema-microdata' };
    }

    log(`Strategy 2 Failed: No logo found in Meta/Schema.`);
    return null;
};

// --- 3. HTML DOM Elements ---
const extractFromDOM = ($: cheerio.CheerioAPI, homePage: string) => {

    const selectors = [
        'header a[href="/"] img',
        'nav a[href="/"] img',
        '.header a[href="/"] img',
        '.navbar a[href="/"] img',
        'header img[class*="logo" i]',
        'nav img[class*="logo" i]',
        'header img[alt*="logo" i]',
        'a[class*="brand" i] img',
        'a[class*="logo" i] img'
    ];

    for (const selector of selectors) {
        const el = $(selector).first();
        const src = el.attr('src') || el.attr('data-src');

        if (src && !isBanner(src)) {
            return { logo: toAbsolute(src, homePage), source: `dom:${selector}` };
        }
    }

    const iconHref = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').first().attr('href');
    if (iconHref) {
        return { logo: toAbsolute(iconHref, homePage), source: 'favicon' };
    }

    return null;
};

// --- 4. Web Manifest ---
const checkManifest = async ($: cheerio.CheerioAPI, homePage: string) => {
    log(`Strategy 4: Checking for Web App Manifest...`);
    const manifestHref = $('link[rel="manifest"]').first().attr('href');
    if (!manifestHref) {
        log(`Strategy 4 Skipped: No <link rel="manifest"> found in head.`);
        return null;
    }

    try {
        const { data } = await axios.get(toAbsolute(manifestHref, homePage), { timeout: 5000, headers: getHeaders() });
        const bestIcon = data?.icons?.sort((a: any, b: any) => (b.sizes || '').localeCompare(a.sizes || ''))[0];
        if (bestIcon?.src) {
            log(`Strategy 4 Success: Found highest resolution icon in manifest.json`);
            return { logo: toAbsolute(bestIcon.src, homePage), source: 'web-manifest' };
        }
    } catch (err: any) {
        log(`Strategy 4 Failed: Could not fetch or parse manifest.json (${err.message})`);
    }

    log(`Strategy 4 Failed: Manifest found, but contained no valid icons.`);
    return null;
};

// --- 5. AI Fallback ---
const askAI = async ($: cheerio.CheerioAPI, homePage: string) => {
    const candidates: any[] = [];
    const svgMap = new Map<string, string>();

    $('img').each((i, el) => {
        if (candidates.length >= 50) return false;
        const src = toAbsolute($(el).attr('src') || '', homePage);
        if (src && !isBanner(src)) {
            candidates.push({
                type: 'img',
                src,
                alt: $(el).attr('alt') || '',
                class: $(el).attr('class') || '',
                id: $(el).attr('id') || '',
                parentTag: $(el).parent().prop('tagName')?.toLowerCase() || ''
            });
        }
    });

    $('svg').each((i, el) => {
        if (candidates.length >= 80) return false;

        const svgId = `inline-svg-${i}`;
        const title = $(el).find('title').text() || $(el).attr('aria-label') || '';
        const viewBox = $(el).attr('viewBox') || '';

        candidates.push({
            type: 'svg',
            src: svgId,
            alt: title,
            class: $(el).attr('class') || '',
            id: $(el).attr('id') || '',
            viewBox,
            parentTag: $(el).parent().prop('tagName')?.toLowerCase() || ''
        });

        svgMap.set(svgId, $.html(el));
    });

    if (!candidates.length) {
        return null;
    }

    try {
        const result = await extractLogo(candidates);
        if (result && result !== 'null') {
            if (result.startsWith('inline-svg-')) {
                const rawSvg = svgMap.get(result);
                if (rawSvg) {
                    const base64Svg = Buffer.from(rawSvg).toString('base64');
                    return {
                        logo: `data:image/svg+xml;base64,${base64Svg}`,
                        source: 'ai-inline-svg'
                    };
                }
            }
            return { logo: result, source: 'ai' };
        }
    } catch (err: any) {
        console.error(err.message);
    }

    return null;
};

const fetchHTML = async (url: string) => {
    try {
        const apiKey = process.env.SCRAPERAPI_KEY;
        if (!apiKey) {
            console.log(`fetchHTML Skipped: SCRAPERAPI_KEY is missing.`);
            return null;
        }

        const res = await axios.get('https://api.scraperapi.com/', {
            params: {
                api_key: apiKey,
                url: url
            },
            timeout: 60000
        });

        return res.data;

    } catch (err: any) {
        const apiError = err.response?.data || err.message;
        console.log(`fetchHTML Error: ${apiError}`);
        return null;
    }
};

// --- Main Execution ---
export const fetchLogo = async (link: string) => {
    log(`--- Starting Extraction for: ${link} ---`);
    try {
        const url = new URL(link.startsWith('http') ? link : `https://${link}`);
        if (!url.hostname.includes('.')) throw new Error('Invalid URL structure');
        const homePage = `${url.protocol}//${url.hostname}`;

        // 1
        const apiLogo = await checkLogoDev(url.hostname);
        if (apiLogo) return { success: true, ...apiLogo, error: null };

        log(`Fetching HTML via ScraperAPI for ${homePage}...`);
        const html = await fetchHTML(homePage);
        if (!html) {
            log(`Failed to fetch HTML content from ${homePage}.`);
            return { success: false, logo: null, source: null, error: 'Could not retrieve website content. It might be blocking our requests.' };
        }
        const $ = cheerio.load(html);
        log(`Successfully fetched and parsed HTML.`);

        // 2
        const metaLogo = extractFromMeta($, homePage);
        if (metaLogo) return { success: true, ...metaLogo, error: null };

        // 3
        const domLogo = extractFromDOM($, homePage);
        if (domLogo) return { success: true, ...domLogo, error: null };

        // 4
        const manifestLogo = await checkManifest($, homePage);
        if (manifestLogo) return { success: true, ...manifestLogo, error: null };

        // 5
        const aiLogo = await askAI($, homePage);
        if (aiLogo) return { success: true, ...aiLogo, error: null };

        log(`Extraction Complete: All strategies exhausted. No logo found.`);
        return { success: false, logo: null, source: null, error: 'We couldn\'t find a logo for this website.' };

    } catch (err: any) {
        log(`Fatal Error: ${err.message} ${err.code ? `(${err.code})` : ''}`);

        let userFriendlyError = 'An unexpected error occurred while looking for the logo.';

        if (err.message === 'Invalid URL structure') {
            userFriendlyError = 'Please enter a valid website URL.';
        } else if (err.code === 'ENOTFOUND') {
            userFriendlyError = 'Website not found. Please check if the domain is spelled correctly.';
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            userFriendlyError = 'The website took too long to respond. It might be offline.';
        } else if (err.code === 'ECONNREFUSED') {
            userFriendlyError = 'The website refused our connection attempt.';
        } else if (err.response?.status) {
            userFriendlyError = `The website is currently unavailable or blocking access (HTTP ${err.response.status}).`;
        } else {
            userFriendlyError = 'Could not reach the website. It might be blocking our scraper.';
        }

        return { success: false, logo: null, source: null, error: userFriendlyError };
    }
};