import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with error handling for build-time
// During build, if env vars are missing, we'll catch the error and continue
let app, db, auth, storage, analytics;

try {
    // Only initialize if we have the minimum required config
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);

        // Initialize Analytics conditionally (only in browser)
        if (typeof window !== 'undefined') {
            isSupported().then(yes => {
                if (yes) analytics = getAnalytics(app);
            });
        }
    } else {
        // Config missing - this is OK during build, will be available at runtime
        // Set to undefined so imports don't fail
        app = undefined;
        db = undefined;
        auth = undefined;
        storage = undefined;
        analytics = undefined;
    }
} catch (error) {
    // During build, catch Firebase initialization errors
    // This allows the build to complete even if env vars are missing
    if (typeof window === 'undefined') {
        // Build-time: just set to undefined, don't throw
        app = undefined;
        db = undefined;
        auth = undefined;
        storage = undefined;
        analytics = undefined;
    } else {
        // Runtime: re-throw so user knows there's a problem
        throw error;
    }
}

export { app, db, auth, storage, analytics };
