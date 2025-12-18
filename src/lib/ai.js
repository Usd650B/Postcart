/**
 * PostCart AI Service
 * This utility handles product extraction from social media captions using Gemini 1.5 Flash.
 */

export async function extractProductFromCaption(caption) {
    try {
        const response = await fetch('/api/ai/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caption })
        });

        if (!response.ok) throw new Error('AI request failed');

        const data = await response.json();
        return data; // Returns { name, price, description }
    } catch (error) {
        console.error("AI Extraction client failed:", error);
        return {
            name: "New Product",
            price: "0",
            description: caption.substring(0, 100)
        };
    }
}

export async function enhanceProductImage(imageUrl, promptType = 'studio') {
    try {
        const response = await fetch('/api/ai/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl, promptType })
        });

        if (!response.ok) throw new Error('Enhancement request failed');

        const data = await response.json();
        return data.enhancedImageUrl;
    } catch (error) {
        console.error("AI Enhancement client failed:", error);
        return imageUrl; // Fallback to original
    }
}
