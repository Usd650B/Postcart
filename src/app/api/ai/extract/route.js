import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { caption } = await request.json();
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
        }

        const prompt = `
            You are an expert e-commerce data extractor. 
            Analyze this social media caption: "${caption}"
            
            Extract the following information and return ONLY a valid JSON object:
            {
                "name": "Product Name (Keep it short and catchy)",
                "price": "Extracted numerical price (as a string, e.g. '50000')",
                "description": "A very short, professional product description"
            }
            
            Note: The store uses Tanzanian Shilling (TZS). If you see prices like '50k' or '50,000/-', extract them as '50000'.
            If you cannot find a price, set it to "0".
            If you cannot find a product, make a guest based on the context.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // Extract the text content from Gemini's response structure
        const resultText = data.candidates[0].content.parts[0].text;

        // Remove any markdown code blocks if the AI included them
        const cleanedJson = resultText.replace(/```json|```/g, '').trim();
        const productData = JSON.parse(cleanedJson);

        return NextResponse.json(productData);
    } catch (error) {
        console.error('AI Extraction Error:', error);
        return NextResponse.json({ error: 'Failed to extract product info' }, { status: 500 });
    }
}
