import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCkS7bkwmLDAB4OF3SyXOBUbws2ixUE09o",
    authDomain: "studio-5840185257-ab19c.firebaseapp.com",
    databaseURL: "https://studio-5840185257-ab19c-default-rtdb.firebaseio.com",
    projectId: "studio-5840185257-ab19c",
    storageBucket: "studio-5840185257-ab19c.firebasestorage.app",
    messagingSenderId: "824069388690",
    appId: "1:824069388690:web:85a7b579b8be1dfab7e94b",
    measurementId: "G-3SLJKPZ82Z"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics conditionally (only in browser)
let analytics;
if (typeof window !== 'undefined') {
    isSupported().then(yes => {
        if (yes) analytics = getAnalytics(app);
    });
}

export { app, db, auth, storage, analytics };
