import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Seed data file - read-only on Vercel (static file in repo)
const DATA_FILE = path.join(process.cwd(), 'products_db.json');

// Default seed data structure
const DEFAULT_DATA = {
    products: [],
    orders: [],
    settings: {
        storeName: "My Social Shop",
        primaryColor: "#6366f1",
        contactEmail: "seller@example.com",
        layout: "grid"
    }
};

/**
 * GET /api/products
 * Returns seed data from products_db.json for initializing new seller accounts.
 * This is read-only and works on Vercel since we're reading a static file.
 */
export async function GET() {
    try {
        // Try to read the seed data file (works on Vercel for static files)
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(data);
            // Ensure the structure matches what the dashboard expects
            return NextResponse.json({
                products: parsed.products || [],
                orders: parsed.orders || [],
                settings: parsed.settings || DEFAULT_DATA.settings
            });
        } else {
            // If file doesn't exist, return default structure
            return NextResponse.json(DEFAULT_DATA);
        }
    } catch (error) {
        console.error('Error reading seed data:', error);
        // Return default structure on error
        return NextResponse.json(DEFAULT_DATA);
    }
}

/**
 * POST /api/products
 * NOTE: Writing to filesystem is not supported on Vercel serverless functions.
 * This endpoint is kept for backward compatibility but does nothing.
 * All data should be stored in Firestore instead.
 */
export async function POST(request) {
    // On Vercel, we cannot write to the filesystem
    // All data persistence should go through Firestore
    return NextResponse.json({ 
        success: false, 
        message: 'File writes not supported on serverless. Use Firestore for data persistence.',
        error: 'Serverless functions are read-only'
    }, { status: 501 });
}
