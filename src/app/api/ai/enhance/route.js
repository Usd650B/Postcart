import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { imageUrl } = await request.json();
        const PHOTOROOM_KEY = process.env.PHOTOROOM_API_KEY;

        if (!PHOTOROOM_KEY || PHOTOROOM_KEY === 'YOUR_PHOTOROOM_KEY_HERE') {
            return NextResponse.json({ error: 'Photoroom API Key not configured' }, { status: 500 });
        }

        if (!imageUrl || imageUrl.length < 5) {
            return NextResponse.json({ error: 'Valid Image URL required' }, { status: 400 });
        }

        console.log(`AI Magic Studio: Requesting Photoroom enhancement for: ${imageUrl}`);

        // Call Photoroom API
        // Photoroom expects an image_url and returns the binary of the processed image
        const response = await fetch('https://sdk.photoroom.com/v1/segment', {
            method: 'POST',
            headers: {
                'x-api-key': PHOTOROOM_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_url: imageUrl,
                background_color: '#ffffff', // Professional Studio White
                format: 'jpg',
                quality: '90'
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Photoroom API Error Response:", errorData);
            return NextResponse.json({ error: 'Photoroom processing failed', details: errorData }, { status: response.status });
        }

        // The response is the binary image. Convert it to a base64 Data URL 
        // so the frontend can display it immediately.
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        return NextResponse.json({
            success: true,
            enhancedImageUrl: dataUrl,
            message: "Background replaced with Studio White ✨"
        });

    } catch (error) {
        console.error('Enhancement Runtime Error:', error);
        return NextResponse.json({
            error: 'Failed to enhance image',
            details: error.message
        }, { status: 500 });
    }
}
