# 🔐 Vercel Environment Variables - Complete List

## 📋 **Required Variables for Deployment**

Add these environment variables in **Vercel Dashboard → Settings → Environment Variables**

---

## 🔥 **Firebase Configuration (REQUIRED)**

These are **essential** for the app to work. Get them from your Firebase Console → Project Settings → General → Your apps.

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Where to find:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ Settings → Project Settings
4. Scroll to "Your apps" section
5. Click on your web app (or create one)
6. Copy all values from the `firebaseConfig` object

---

## 🤖 **AI Services (REQUIRED)**

### **Google Gemini API Key**
```
GEMINI_API_KEY=your_gemini_api_key_here
```

**Where to get:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key"
3. Create a new API key or use existing one
4. Copy the key

**Used for:**
- Product extraction from social media captions
- URL content analysis

---

### **Photoroom API Key (REQUIRED)**
```
PHOTOROOM_API_KEY=your_photoroom_api_key_here
```

**Where to get:**
1. Go to [Photoroom API](https://www.photoroom.com/api/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Copy the key

**Used for:**
- Magic Studio feature (background removal)
- Product image enhancement

---

## 📱 **Meta/Facebook API (OPTIONAL)**

These are **optional** - only needed if you want users to connect their Instagram/Facebook accounts directly.

```
NEXT_PUBLIC_META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
NEXT_PUBLIC_META_REDIRECT_URI=https://your-domain.vercel.app/api/auth/meta/callback
```

**Where to get:**
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Instagram Basic Display or Instagram Graph API product
4. Get App ID and App Secret
5. Set redirect URI to: `https://your-domain.vercel.app/api/auth/meta/callback`

**Note:** If you don't set these, users can still use the URL paste feature to extract products.

---

## 📝 **Quick Setup Checklist**

### ✅ **Minimum Required (App will work):**
- [ ] All 8 Firebase variables
- [ ] `GEMINI_API_KEY`
- [ ] `PHOTOROOM_API_KEY`

### ✅ **Full Features (Recommended):**
- [ ] All above +
- [ ] `NEXT_PUBLIC_META_APP_ID`
- [ ] `META_APP_SECRET`
- [ ] `NEXT_PUBLIC_META_REDIRECT_URI`

---

## 🚀 **How to Add in Vercel**

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Select your project

2. **Navigate to Settings**
   - Click on your project
   - Go to **Settings** tab
   - Click **Environment Variables** in sidebar

3. **Add Each Variable**
   - Click **Add New**
   - Enter variable name (exactly as shown above)
   - Enter variable value
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**

4. **Redeploy**
   - After adding variables, go to **Deployments**
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**

---

## 🔍 **Variable Types Explained**

### **NEXT_PUBLIC_* Variables**
- These are **exposed to the browser** (client-side)
- Safe to use in frontend code
- Visible in browser DevTools (don't put secrets here!)

### **Server-Only Variables** (No NEXT_PUBLIC_ prefix)
- These are **only available on the server**
- Never exposed to the browser
- Use for API keys and secrets:
  - `GEMINI_API_KEY`
  - `PHOTOROOM_API_KEY`
  - `META_APP_SECRET`

---

## ⚠️ **Important Notes**

1. **Never commit these to Git!**
   - They should only be in Vercel environment variables
   - Add `.env.local` to `.gitignore` (if you use it locally)

2. **Case Sensitive**
   - Variable names must match exactly (including `NEXT_PUBLIC_` prefix)

3. **Redeploy After Changes**
   - Environment variable changes require a redeploy
   - Vercel will automatically redeploy if you enable "Auto-deploy"

4. **Test Locally**
   - Create `.env.local` file in project root
   - Add all variables there for local testing
   - Never commit `.env.local` to Git!

---

## 📋 **Copy-Paste Template**

Use this template and fill in your values:

```bash
# Firebase (REQUIRED)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# AI Services (REQUIRED)
GEMINI_API_KEY=
PHOTOROOM_API_KEY=

# Meta API (OPTIONAL)
NEXT_PUBLIC_META_APP_ID=
META_APP_SECRET=
NEXT_PUBLIC_META_REDIRECT_URI=
```

---

## ✅ **Verification**

After deployment, check:
1. ✅ App loads without errors
2. ✅ User can sign up/login (Firebase Auth works)
3. ✅ Products can be added (Firestore works)
4. ✅ AI extraction works (Gemini API works)
5. ✅ Magic Studio works (Photoroom API works)

If any feature doesn't work, check:
- Vercel deployment logs for errors
- Browser console for missing variables
- Verify all required variables are set

---

**Total Variables Needed:**
- **Minimum**: 10 variables (8 Firebase + 2 AI)
- **Full Features**: 13 variables (add 3 Meta variables)

