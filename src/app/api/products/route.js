import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// This is a temporary local database to sync products across browsers
const DATA_FILE = path.join(process.cwd(), 'products_db.json');

// Initialize with a robust structure
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        products: [],
        orders: [],
        settings: {
            storeName: "My Social Shop",
            primaryColor: "#6366f1",
            contactEmail: "seller@example.com",
            layout: "grid"
        }
    }));
}

export async function GET() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        return NextResponse.json({ products: [], orders: [], settings: {} });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

        // Merge or replace based on what was sent
        const updatedData = { ...currentData, ...body };

        fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
