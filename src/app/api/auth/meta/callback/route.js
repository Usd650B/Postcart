import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Should be userId

    if (!code || !state) {
        return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
    const APP_SECRET = process.env.META_APP_SECRET;
    const REDIRECT_URI = process.env.NEXT_PUBLIC_META_REDIRECT_URI;

    try {
        // 1. Exchange code for Short-Lived Access Token
        const tokenResponse = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${APP_SECRET}&code=${code}`
        );
        const tokenData = await tokenResponse.json();

        if (tokenData.error) throw new Error(tokenData.error.message);

        const shortLivedToken = tokenData.access_token;

        // 2. Exchange Short-Lived Token for Long-Lived Token (60 days)
        const longLivedResponse = await fetch(
            `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedToken}`
        );
        const longLivedData = await longLivedResponse.json();

        if (longLivedData.error) throw new Error(longLivedData.error.message);

        const longLivedToken = longLivedData.access_token;

        // 3. Save Long-Lived Token to Firestore for the user (state is the userId)
        const sellerRef = doc(db, "sellers", state);
        await updateDoc(sellerRef, {
            metaToken: longLivedToken,
            tokenUpdatedAt: new Date().toISOString()
        });

        // 4. Redirect back to dashboard
        return NextResponse.redirect(new URL('/dashboard?auth=success', request.url));
    } catch (error) {
        console.error('Meta OAuth Error:', error);
        return NextResponse.redirect(new URL('/dashboard?auth=failed', request.url));
    }
}
