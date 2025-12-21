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

        // Check if this is an Instagram or Facebook URL
        const isInstagramUrl = url.includes('instagram.com') || url.includes('instagr.am');
        const isFacebookUrl = url.includes('facebook.com') || url.includes('fb.com') || url.includes('fb.me');

        // Fetch the page content
        let pageContent = '';
        let imageUrl = '';
        let caption = '';

        // For Instagram, try to extract what we can, but don't give up too early
        if (isInstagramUrl) {
            console.log('Instagram URL detected, attempting extraction...');
            try {
                // Try to fetch with better headers
                // Create timeout controller
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Referer': 'https://www.instagram.com/'
                    },
                    redirect: 'follow',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

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
                        console.log('Successfully extracted Instagram content');
                    } else {
                        // No content extracted, but continue to AI extraction with URL context
                        console.warn('Instagram fetch succeeded but no content extracted, using AI with URL context');
                        pageContent = `Instagram post URL: ${url}. Please extract product information from this Instagram post.`;
                    }
                } else {
                    // Fetch failed, but still try AI extraction
                    console.warn(`Instagram fetch failed with status ${response.status}, using AI with URL context`);
                    pageContent = `Instagram post URL: ${url}. The post may be private or require login. Please extract any product information that might be visible from the URL.`;
                }
            } catch (fetchError) {
                // Network error or timeout - still try AI extraction
                console.warn('Instagram fetch error:', fetchError.message);
                pageContent = `Instagram post URL: ${url}. Unable to fetch content directly (may be private). Please analyze the URL and extract any product information if available.`;
            }
        } else if (isFacebookUrl) {
            // For Facebook URLs - similar handling to Instagram
            console.log('Facebook URL detected, attempting extraction...');
            try {
                // Create timeout controller
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Referer': 'https://www.facebook.com/'
                    },
                    redirect: 'follow',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

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
                        pageContent = caption || 'Facebook post';
                        console.log('Successfully extracted Facebook content');
                    } else {
                        // No content extracted, but continue to AI extraction with URL context
                        console.warn('Facebook fetch succeeded but no content extracted, using AI with URL context');
                        pageContent = `Facebook post URL: ${url}. Please extract product information from this Facebook post.`;
                    }
                } else {
                    // Fetch failed, but still try AI extraction
                    console.warn(`Facebook fetch failed with status ${response.status}, using AI with URL context`);
                    pageContent = `Facebook post URL: ${url}. The post may be private or require login. Please extract any product information that might be visible from the URL.`;
                }
            } catch (fetchError) {
                // Network error or timeout - still try AI extraction
                console.warn('Facebook fetch error:', fetchError.message);
                pageContent = `Facebook post URL: ${url}. Unable to fetch content directly (may be private). Please analyze the URL and extract any product information if available.`;
            }
        } else {
            // For other URLs (product pages, e-commerce sites, etc.)
            console.log('Non-social media URL detected, attempting extraction...');
            try {
                // Create timeout controller
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5'
                    },
                    redirect: 'follow',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                if (response.ok) {
                    const html = await response.text();
                    
                    // Try to extract Open Graph meta tags
                    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
                    const ogDescriptionMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
                    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
                    
                    imageUrl = ogImageMatch ? ogImageMatch[1] : '';
                    caption = ogDescriptionMatch ? ogDescriptionMatch[1] : (ogTitleMatch ? ogTitleMatch[1] : html.substring(0, 500));
                    
                    pageContent = caption || `Product page URL: ${url}`;
                    console.log('Successfully extracted content from URL');
                } else {
                    // Fetch failed, but still try AI extraction
                    console.warn(`URL fetch failed with status ${response.status}, using AI with URL context`);
                    pageContent = `URL: ${url}. Platform: ${platform || 'Unknown'}. Please extract any product information that might be in this URL.`;
                }
            } catch (fetchError) {
                // Network error or timeout - still try AI extraction
                console.warn('URL fetch error, using AI analysis:', fetchError.message);
                pageContent = `Analyze this URL: ${url}. Platform: ${platform || 'Unknown'}. Extract product name, price, and description if available.`;
            }
        }

        // Use Gemini AI to extract product information
        // Even if pageContent is minimal, AI can still analyze the URL
        const prompt = `
You are an expert e-commerce data extractor analyzing a social media post.

URL: ${url}
Platform: ${platform || 'Unknown'}
Content: ${pageContent || 'No content extracted from URL'}

Extract product information and return ONLY a valid JSON object (no markdown, no code blocks, just pure JSON):
{
    "name": "Product Name (short and catchy, or 'Unknown Product' if not found)",
    "price": "Numerical price as string (e.g. '50000'), or '0' if not found",
    "description": "Professional product description (or content summary if no product found)"
}

IMPORTANT:
- The store uses Tanzanian Shilling (TZS). Convert prices like '50k', '50,000/-', '50K TSh' to '50000'
- If you see prices in other currencies, convert to TZS (approximate: 1 USD ≈ 2300 TZS)
- If no clear product is found, make an educated guess based on the URL or content
- Keep descriptions under 150 characters
- Return ONLY the JSON object, nothing else
`;
        
        console.log('Calling Gemini AI with prompt length:', prompt.length);

        console.log('Making Gemini API request...');
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

        console.log('Gemini API response status:', aiResponse.status);

        if (!aiResponse.ok) {
            const errorData = await aiResponse.text();
            console.error('Gemini API Error Response:', {
                status: aiResponse.status,
                statusText: aiResponse.statusText,
                body: errorData
            });
            
            // Check for specific error types
            if (aiResponse.status === 401 || aiResponse.status === 403) {
                throw new Error('GEMINI_API_KEY_INVALID: Invalid or missing API key');
            } else if (aiResponse.status === 429) {
                throw new Error('GEMINI_RATE_LIMIT: API rate limit exceeded');
            } else {
                throw new Error(`GEMINI_API_ERROR: ${aiResponse.status} - ${errorData.substring(0, 200)}`);
            }
        }

        const aiData = await aiResponse.json();
        console.log('Gemini API response structure:', {
            hasCandidates: !!aiData.candidates,
            candidatesLength: aiData.candidates?.length,
            hasContent: !!aiData.candidates?.[0]?.content
        });
        
        // Check if response has the expected structure
        if (!aiData.candidates || !aiData.candidates[0] || !aiData.candidates[0].content) {
            console.error('Unexpected Gemini API response:', JSON.stringify(aiData, null, 2));
            throw new Error('GEMINI_UNEXPECTED_RESPONSE: AI service returned unexpected response format');
        }

        const resultText = aiData.candidates[0].content.parts[0].text;
        console.log('Gemini response text length:', resultText?.length);
        
        if (!resultText) {
            throw new Error('GEMINI_EMPTY_RESPONSE: AI service returned empty response');
        }

        // Clean the JSON response
        let cleanedJson = resultText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        
        // Try to extract JSON object if it's embedded in text
        const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanedJson = jsonMatch[0];
        }
        
        console.log('Attempting to parse JSON:', cleanedJson.substring(0, 200));
        
        let productData;
        try {
            productData = JSON.parse(cleanedJson);
            console.log('Successfully parsed product data:', productData);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            console.error('Full cleaned JSON:', cleanedJson);
            throw new Error(`GEMINI_JSON_PARSE_ERROR: Failed to parse AI response as JSON - ${parseError.message}`);
        }

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
        console.error('Error stack:', error.stack);
        
        // Handle specific Instagram/Facebook errors
        if (error.message === 'INSTAGRAM_REQUIRES_API' || error.message?.includes('INSTAGRAM')) {
            return NextResponse.json({
                error: 'Instagram URLs require official API connection',
                details: 'Instagram posts are protected and cannot be accessed directly. Please use the "Official Instagram Connection" button to connect your Meta account, or add products manually.',
                requiresApi: true,
                platform: 'Instagram'
            }, { status: 403 });
        }
        
        // Check if it's a Facebook URL that failed
        const isFacebookUrl = url?.includes('facebook.com') || url?.includes('fb.com') || url?.includes('fb.me');
        if (isFacebookUrl && (error.message?.includes('fetch') || error.message?.includes('network'))) {
            return NextResponse.json({
                error: 'Facebook URL extraction failed',
                details: 'Facebook posts are often protected and may require login. The AI will still attempt to extract information from the URL, but for best results, use the "Official Connection" button to connect your Meta account, or add products manually.',
                requiresApi: false,
                platform: 'Facebook'
            }, { status: 403 });
        }
        
        // Check if it's a Gemini API error
        if (error.message?.includes('GEMINI') || error.message?.includes('AI service') || error.message?.includes('Gemini')) {
            let userMessage = 'The AI service encountered an error.';
            
            if (error.message.includes('GEMINI_API_KEY_INVALID')) {
                userMessage = 'Invalid or missing GEMINI_API_KEY. Please check your Vercel environment variables.';
            } else if (error.message.includes('GEMINI_RATE_LIMIT')) {
                userMessage = 'API rate limit exceeded. Please try again in a few moments.';
            } else if (error.message.includes('GEMINI_JSON_PARSE_ERROR')) {
                userMessage = 'AI returned an unexpected format. Please try again or add the product manually.';
            }
            
            return NextResponse.json({
                error: 'AI extraction service error',
                details: userMessage,
                technicalDetails: error.message,
                requiresApi: false
            }, { status: 500 });
        }
        
        // Check if it's a JSON parsing error
        if (error.message?.includes('JSON') || error.message?.includes('parse')) {
            return NextResponse.json({
                error: 'Failed to parse AI response',
                details: 'The AI service returned an unexpected format. Please try again or add the product manually.',
                technicalDetails: error.message,
                requiresApi: false
            }, { status: 500 });
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
            details: error.message || 'Unknown error occurred. Please check the server logs for more details.',
            requiresApi: false
        }, { status: 500 });
    }
}

