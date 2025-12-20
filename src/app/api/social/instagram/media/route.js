import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        // SECURITY: Verify the caller is authenticated and is the owner of the requested userId
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized - Missing or invalid token' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(token);
        
        if (decodedToken.uid !== userId) {
            return NextResponse.json({ error: 'Forbidden - You can only access your own data' }, { status: 403 });
        }

        // 1. Get the long-lived token from Firestore
        const sellerRef = doc(db, "sellers", userId);
        const docSnap = await getDoc(sellerRef);

        if (!docSnap.exists() || !docSnap.data().metaToken) {
            return NextResponse.json({ error: 'Meta account not connected' }, { status: 401 });
        }

        const accessToken = docSnap.data().metaToken;

        // 2. Resolve the Instagram Business Account ID
        // First, get the Facebook Pages linked to the user
        const pagesResponse = await fetch(
            `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name&access_token=${accessToken}`
        );
        const pagesData = await pagesResponse.json();

        if (pagesData.error) throw new Error(pagesData.error.message);

        // Find the first page that has an Instagram Business Account linked
        const pageWithIg = pagesData.data.find(page => page.instagram_business_account);

        if (!pageWithIg) {
            return NextResponse.json({ error: 'No Instagram Business Account linked to your Facebook Pages' }, { status: 404 });
        }

        const instagramId = pageWithIg.instagram_business_account.id;

        // 3. Fetch Media from the Instagram Business Account
        const mediaResponse = await fetch(
            `https://graph.facebook.com/v19.0/${instagramId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp&limit=20&access_token=${accessToken}`
        );
        const mediaData = await mediaResponse.json();

        if (mediaData.error) throw new Error(mediaData.error.message);

        // 4. Return formatted media items
        const posts = mediaData.data.map(item => ({
            id: item.id,
            image: item.media_url || item.thumbnail_url,
            caption: item.caption || "",
            timestamp: item.timestamp
        }));

        return NextResponse.json({ posts });
    } catch (error) {
        console.error('Instagram Media Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch Instagram media' }, { status: 500 });
    }
}
