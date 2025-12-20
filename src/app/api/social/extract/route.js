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

        // Fetch the page content
        let pageContent = '';
        let imageUrl = '';
        let caption = '';

        try {
            // For Instagram/Facebook, we'll try to extract from the URL structure
            // Note: Direct scraping is limited due to authentication requirements
            // This is a simplified approach that works for public profiles/posts
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.ok) {
                const html = await response.text();
                
                // Try to extract Open Graph meta tags (common on social media)
                const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                const ogDescriptionMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
                
                imageUrl = ogImageMatch ? ogImageMatch[1] : '';
                caption = ogDescriptionMatch ? ogDescriptionMatch[1] : html.substring(0, 500); // Fallback to first 500 chars
                
                pageContent = caption;
            } else {
                // If direct fetch fails, use AI to analyze the URL itself
                pageContent = `URL: ${url}. Platform: ${platform || 'Unknown'}. Please extract any product information that might be in this social media post.`;
            }
        } catch (fetchError) {
            console.warn('Direct fetch failed, using AI analysis:', fetchError);
            // Fallback: Let AI analyze the URL structure
            pageContent = `Analyze this social media URL: ${url}. Platform: ${platform || 'Unknown'}. Extract product name, price, and description if available.`;
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
        return NextResponse.json({
            error: 'Failed to extract product from URL',
            details: error.message
        }, { status: 500 });
    }
}

