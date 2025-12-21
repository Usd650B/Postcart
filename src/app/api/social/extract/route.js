import { NextResponse } from 'next/server';

/**
 * POST /api/social/extract
 * Extracts product information from a social media URL using AI
 * This endpoint fetches the page content and uses Gemini AI to extract products
 */
export async function POST(request) {
    try {
        const { url, platform } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'Valid URL required' }, { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
        }

        // Check if this is an Instagram URL
        const isInstagramUrl = url.includes('instagram.com');
        const isFacebookUrl = url.includes('facebook.com');

        // Fetch the page content
        let pageContent = '';
        let imageUrl = '';
        let caption = '';

        // For Instagram, try using oEmbed API first (public endpoint)
        if (isInstagramUrl) {
            try {
                // Instagram oEmbed API (requires authentication for most posts, but worth trying)
                // Format: https://graph.facebook.com/v18.0/instagram_oembed?url=POST_URL&access_token=TOKEN
                // Since we don't have token, try direct fetch with better headers
                let response;
                try {
                    response = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Referer': 'https://www.instagram.com/'
                        },
                        redirect: 'follow'
                    });

                    if (response.ok) {
                        const html = await response.text();
                        
                        // Try to extract Open Graph meta tags
                        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                        const ogDescriptionMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
                        const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
                        
                        imageUrl = ogImageMatch ? ogImageMatch[1] : '';
                        caption = ogDescriptionMatch ? ogDescriptionMatch[1] : (ogTitleMatch ? ogTitleMatch[1] : '');
                        
                        // If we got content, use it
                        if (caption || imageUrl) {
                            pageContent = caption || 'Instagram post';
                        } else {
                            // Instagram likely blocked the request - throw specific error
                            throw new Error('INSTAGRAM_PROTECTED');
                        }
                    } else if (response.status === 403 || response.status === 401 || response.status === 404) {
                        // Instagram blocked the request
                        throw new Error('INSTAGRAM_REQUIRES_API');
                    } else {
                        throw new Error('INSTAGRAM_PROTECTED');
                    }
                } catch (fetchError) {
                    // Re-throw if it's our specific error
                    if (fetchError.message === 'INSTAGRAM_REQUIRES_API' || fetchError.message === 'INSTAGRAM_PROTECTED') {
                        throw fetchError;
                    }
                    // For other errors, check response status if available
                    if (response && (response.status === 403 || response.status === 401)) {
                        throw new Error('INSTAGRAM_REQUIRES_API');
                    }
                    throw new Error('INSTAGRAM_REQUIRES_API');
                }
            } catch (fetchError) {
                // Instagram URLs are protected - require official API
                if (fetchError.message === 'INSTAGRAM_REQUIRES_API' || fetchError.message === 'INSTAGRAM_PROTECTED') {
                    throw new Error('INSTAGRAM_REQUIRES_API');
                }
                throw new Error('INSTAGRAM_REQUIRES_API');
            }
        } else {
            // For other URLs (Facebook, product pages, etc.)
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                if (response.ok) {
                    const html = await response.text();
                    
                    // Try to extract Open Graph meta tags
                    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                    const ogDescriptionMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
                    
                    imageUrl = ogImageMatch ? ogImageMatch[1] : '';
                    caption = ogDescriptionMatch ? ogDescriptionMatch[1] : html.substring(0, 500);
                    
                    pageContent = caption;
                } else {
                    pageContent = `URL: ${url}. Platform: ${platform || 'Unknown'}. Please extract any product information that might be in this social media post.`;
                }
            } catch (fetchError) {
                console.warn('Direct fetch failed, using AI analysis:', fetchError);
                pageContent = `Analyze this social media URL: ${url}. Platform: ${platform || 'Unknown'}. Extract product name, price, and description if available.`;
            }
        }

        // Use Gemini AI to extract product information
        const prompt = `
You are an expert e-commerce data extractor analyzing a social media post.

URL: ${url}
Platform: ${platform || 'Unknown'}
Content: ${pageContent}

Extract product information and return ONLY a valid JSON object:
{
    "name": "Product Name (short and catchy, or 'Unknown Product' if not found)",
    "price": "Numerical price as string (e.g. '50000'), or '0' if not found",
    "description": "Professional product description (or content summary if no product found)"
}

IMPORTANT:
- The store uses Tanzanian Shilling (TZS). Convert prices like '50k', '50,000/-', '50K TSh' to '50000'
- If you see prices in other currencies, convert to TZS (approximate: 1 USD ≈ 2300 TZS)
- If no clear product is found, make an educated guess based on the content
- Keep descriptions under 150 characters
`;

        const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!aiResponse.ok) {
            throw new Error('AI service failed');
        }

        const aiData = await aiResponse.json();
        const resultText = aiData.candidates[0].content.parts[0].text;
        const cleanedJson = resultText.replace(/```json|```/g, '').trim();
        const productData = JSON.parse(cleanedJson);

        // Return extracted product with image URL if found
        return NextResponse.json({
            success: true,
            product: {
                name: productData.name || 'Unknown Product',
                price: productData.price || '0',
                description: productData.description || 'No description available',
                image: imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
                platform: platform || 'Unknown',
                sourceUrl: url
            }
        });

    } catch (error) {
        console.error('URL Extraction Error:', error);
        
        // Handle specific Instagram error
        if (error.message === 'INSTAGRAM_REQUIRES_API' || error.message?.includes('INSTAGRAM')) {
            return NextResponse.json({
                error: 'Instagram URLs require official API connection',
                details: 'Instagram posts are protected and cannot be accessed directly. Please use the "Official Instagram Connection" button to connect your Meta account, or add products manually.',
                requiresApi: true,
                platform: 'Instagram'
            }, { status: 403 });
        }
        
        // Check if it's a network/access error
        if (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('CORS')) {
            return NextResponse.json({
                error: 'Unable to access URL',
                details: 'The URL may be private, require login, or be blocked. Try using the official API connection or add products manually.',
                requiresApi: false
            }, { status: 403 });
        }
        
        return NextResponse.json({
            error: 'Failed to extract product from URL',
            details: error.message || 'Unknown error occurred',
            requiresApi: false
        }, { status: 500 });
    }
}

