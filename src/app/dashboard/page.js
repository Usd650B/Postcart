"use client";
import { useState, useEffect } from 'react';
import { db, storage, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { extractProductFromCaption, enhanceProductImage } from '@/lib/ai';

const MOCK_SOCIAL_POSTS = {
    Instagram: [
        { id: 'ig1', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600', caption: 'New summer dress just arrived! Only 79,000/- #fashion #summer' },
        { id: 'ig2', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600', caption: 'Classic heels for your next event. Price: 120k TSh. DM to order!' },
        { id: 'ig3', image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600', caption: 'Streetwear essentials. Grab this hoodie for 55,000 TSh. #streetstyle' }
    ],
    Facebook: [
        { id: 'fb1', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600', caption: 'Handcrafted leather jacket. Premium quality. 149,000 TSh.' },
        { id: 'fb2', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', caption: 'High performance sneakers. Ready for the track? 89,000/-' },
        { id: 'fb3', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', caption: 'Smart Watch Series 5. Stay connected. Only 299k TSh.' }
    ]
};

export default function Dashboard() {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [isConnected, setIsConnected] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [products, setProducts] = useState([]);
    const [storeLink, setStoreLink] = useState('');
    const [activePlatform, setActivePlatform] = useState(null);
    const [orders, setOrders] = useState([]);
    const [settings, setSettings] = useState({
        storeName: "Social Shop",
        primaryColor: "#6366f1",
        contactEmail: "seller@example.com",
        layout: "grid"
    });
    const [editingProduct, setEditingProduct] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importStep, setImportStep] = useState('accounts');
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [socialFeed, setSocialFeed] = useState([]);
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600' });
    const [socialUrl, setSocialUrl] = useState('');
    const [isAssessing, setIsAssessing] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);

                // Real-time listener for products, orders, and settings
                const sellerRef = doc(db, "sellers", user.uid);

                const unsubscribeSnap = onSnapshot(sellerRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.products) setProducts(data.products);
                        if (data.orders) setOrders(data.orders);
                        if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
                        setIsConnected(true);
                    } else {
                        // Seed from products_db.json if Firestore is empty
                        fetch('/api/products')
                            .then(res => res.json())
                            .then(data => {
                                if (data.products && data.products.length > 0) {
                                    console.log("Seeding Firestore from local DB...");
                                    const sellerRefSync = doc(db, "sellers", user.uid);
                                    setDoc(sellerRefSync, {
                                        products: data.products,
                                        orders: [],
                                        settings: settings
                                    });
                                }
                            })
                            .catch(err => console.error("Seeding failed", err));
                    }
                });

                setStoreLink(`${window.location.origin}/store/${user.uid}`);

                return () => unsubscribeSnap();
            } else {
                // If no user is logged in, redirect to login page
                window.location.href = '/login';
            }
        });

        const handleTabSwitch = (e) => {
            if (e.detail && typeof e.detail === 'string') {
                setActiveTab(e.detail);
            }
        };

        window.addEventListener('setDashboardTab', handleTabSwitch);
        return () => {
            unsubscribeAuth();
            window.removeEventListener('setDashboardTab', handleTabSwitch);
        };
    }, []);

    const syncToDB = async (updates) => {
        if (!currentUser) return;
        try {
            const sellerRef = doc(db, "sellers", currentUser.uid);
            const docSnap = await getDoc(sellerRef);

            if (!docSnap.exists()) {
                await setDoc(sellerRef, {
                    products: [],
                    orders: [],
                    settings: settings,
                    ...updates
                });
            } else {
                await updateDoc(sellerRef, updates);
            }
        } catch (err) {
            console.error("Failed to sync to Firebase", err);
        }
    };

    const handleConnect = (platform) => {
        const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
        const REDIRECT_URI = process.env.NEXT_PUBLIC_META_REDIRECT_URI;

        // If Meta API IS configured, go to official OAuth Flow
        if (platform === 'Instagram' && APP_ID && !APP_ID.includes('your_app_id')) {
            const userId = currentUser.uid;
            const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&state=${userId}&scope=instagram_manage_basic,pages_show_list,pages_read_engagement`;
            window.location.href = oauthUrl;
            return;
        }

        // Otherwise, fall back to the Mock/Simulation flow
        setActivePlatform(platform);
        setIsImportModalOpen(true);
        setImportStep('accounts');
        setSocialUrl('');
    };

    const handleStartAssessment = async () => {
        setIsAssessing(true);

        try {
            // Attempt Live Fetch first
            const response = await fetch(`/api/social/instagram/media?userId=${currentUser.uid}`);
            const data = await response.json();

            if (!data.error) {
                setSocialFeed(data.posts || []);
                setImportStep('posts');
                setIsAssessing(false);
                return;
            }

            // If "Live" failed because not connected, try to connect if keys exist
            if (data.error.includes('not connected') && process.env.NEXT_PUBLIC_META_APP_ID?.length > 10) {
                handleConnect('Instagram');
                return;
            }

            throw new Error(data.error);
        } catch (error) {
            console.warn("Falling back to AI Simulation:", error);

            // High-fidelity fallback simulation
            setTimeout(() => {
                setSocialFeed(MOCK_SOCIAL_POSTS[activePlatform] || []);
                setImportStep('posts');
                setIsAssessing(false);
            }, 2000);
        }
    };

    const confirmSelection = () => {
        setImportStep('refine');
    };

    const finalizeImport = async () => {
        setIsExtracting(true);
        setIsImportModalOpen(false);

        try {
            const newProducts = [];
            for (const post of selectedPosts) {
                // Call Gemini for each post
                const extracted = await extractProductFromCaption(post.caption);

                newProducts.push({
                    id: Date.now() + Math.random(),
                    image: post.image,
                    name: extracted.name || post.name || "New Product",
                    price: extracted.price || post.price || "0",
                    description: extracted.description || post.caption,
                    platform: activePlatform
                });
            }

            const updated = [...newProducts, ...products];
            setProducts(updated);
            syncToDB({ products: updated });
            window.dispatchEvent(new Event('storage'));

            setIsConnected(true);
            setIsExtracting(false);
            setActiveTab('products');
            setSelectedPosts([]);
        } catch (error) {
            console.error("AI import failed", error);
            setIsExtracting(false);
            alert("Something went wrong with the AI sync. Please try again.");
        }
    };

    const togglePostSelection = (post) => {
        if (selectedPosts.find(p => p.id === post.id)) {
            setSelectedPosts(selectedPosts.filter(p => p.id !== post.id));
        } else {
            setSelectedPosts([...selectedPosts, post]);
        }
    };

    const removeProduct = (id) => {
        setProducts(prev => {
            const updated = prev.filter(p => p.id !== id);
            syncToDB({ products: updated });
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
    };

    const updateProduct = (updatedProduct) => {
        setProducts(prev => {
            const updated = prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
            syncToDB({ products: updated });
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
        setEditingProduct(null);
    };

    const handleEnhance = async (currentImage, type = 'new') => {
        setIsEnhancing(true);
        try {
            const dataUrl = await enhanceProductImage(currentImage);

            // If Photoroom returned a Base64 string, upload it to Firebase Storage
            if (dataUrl.startsWith('data:')) {
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const storageRef = ref(storage, `products/enhanced_${Date.now()}.jpg`);
                await uploadBytes(storageRef, blob);
                const permanentUrl = await getDownloadURL(storageRef);

                if (type === 'new') {
                    setNewProduct(prev => ({ ...prev, image: permanentUrl }));
                } else {
                    setEditingProduct(prev => ({ ...prev, image: permanentUrl }));
                }
            } else {
                // If it already returned a URL (not base64), just use it
                if (type === 'new') {
                    setNewProduct(prev => ({ ...prev, image: dataUrl }));
                } else {
                    setEditingProduct(prev => ({ ...prev, image: dataUrl }));
                }
            }
            alert("Magic Studio: Background replaced successfully! ✨");
        } catch (err) {
            console.error("Enhancement failed", err);
            alert("Magic Studio failed. Please check your photo and try again.");
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setNewProduct(prev => ({ ...prev, image: url }));
        } catch (err) {
            console.error("Upload failed", err);
            alert("Image upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleManualAdd = () => {
        const productToAdd = {
            ...newProduct,
            id: Date.now(),
            platform: 'manual'
        };
        const updated = [productToAdd, ...products];
        setProducts(updated);
        syncToDB({ products: updated });
        setIsManualAddOpen(false);
        setNewProduct({ name: '', price: '', description: '', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600' });
        setActiveTab('products');
    };

    const saveSettings = () => {
        syncToDB({ settings });
        alert('Settings saved! Your store is being updated.');
        window.dispatchEvent(new Event('storage'));
    };

    const totalRevenue = orders.reduce((acc, order) => acc + (parseFloat(order.total) || 0), 0);

    const SidebarItem = ({ id, icon, label }) => {
        const isActive = activeTab === id;
        return (
            <div
                onClick={() => setActiveTab(id)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? 'white' : '#475569',
                    boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none',
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s',
                    color: isActive ? 'white' : '#64748b'
                }}>
                    {icon}
                </div>
                <span style={{
                    fontSize: '0.85rem',
                    fontWeight: isActive ? '700' : '600',
                    letterSpacing: '0.01em'
                }}>{label}</span>

                {isActive && (
                    <div style={{
                        position: 'absolute',
                        right: '0.75rem',
                        width: '5px',
                        height: '5px',
                        background: 'white',
                        borderRadius: '50%',
                    }} />
                )}
            </div>
        );
    };

    if (isExtracting) {
        return (
            <div className="container" style={{ padding: '8rem 0', textAlign: 'center' }}>
                <div className="loading-spinner" style={{
                    width: '60px', height: '60px', border: '5px solid #f3f3f3', borderTop: '5px solid var(--primary)',
                    borderRadius: '50%', margin: '0 auto 2rem', animation: 'spin 1s linear infinite'
                }} />
                <h2 style={{ marginBottom: '1rem' }}>AI Scanning {activePlatform}...</h2>
                <p style={{ color: '#64748b' }}>Sorting through posts to find your products.</p>
                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
            </div>
        );
    }

    return (
        <div className="container dashboard-container" style={{ padding: '2rem 1.25rem', minHeight: '85vh' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="dashboard-grid">
                <aside style={{
                    padding: '1.5rem 0',
                    position: 'sticky',
                    top: '4.5rem',
                    zIndex: 40,
                    height: 'calc(100vh - 5.5rem)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem'
                }} className="dashboard-sidebar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="sidebar-inner">
                        <div className="sidebar-section">
                            <h2 style={{
                                fontSize: '0.65rem',
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                padding: '0 1rem',
                                marginBottom: '1.25rem',
                                fontWeight: '800'
                            }} className="mobile-hide">Management</h2>
                            <div className="tab-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <SidebarItem id="overview" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>} label="Overview" />
                                <SidebarItem id="analytics" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>} label="Analytics" />
                                <SidebarItem id="products" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>} label="Products" />
                                <SidebarItem id="orders" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>} label="Orders" />
                            </div>
                        </div>

                        <div className="sidebar-section">
                            <h2 style={{
                                fontSize: '0.65rem',
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                padding: '0 1rem',
                                marginBottom: '1.25rem',
                                fontWeight: '800'
                            }} className="mobile-hide">Storefront</h2>
                            <div className="tab-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <SidebarItem id="mystore" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>} label="My Store" />
                                <SidebarItem id="settings" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>} label="Settings" />
                            </div>
                        </div>

                        <div className="sidebar-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <button
                                onClick={async () => {
                                    await auth.signOut();
                                    window.location.href = '/';
                                }}
                                className="sidebar-item"
                                style={{
                                    width: '100%',
                                    background: 'none',
                                    border: 'none',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    color: '#ef4444'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Logout</span>
                            </button>
                        </div>
                    </div>
                </aside>

                <main style={{ paddingBottom: '4rem' }}>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .sidebar-item:hover {
                            background: #f8fafc !important;
                            color: var(--primary) !important;
                        }
                        .sidebar-item.active:hover {
                            background: var(--primary) !important;
                            color: white !important;
                        }

                        @media (min-width: 769px) {
                            .dashboard-grid { grid-template-columns: 220px 1fr !important; gap: 4rem !important; }
                            .dashboard-sidebar { 
                                border-right: 1px solid rgba(0,0,0,0.05); 
                                padding-right: 1.5rem !important;
                            }
                        }
                        @media (max-width: 768px) {
                            .dashboard-sidebar {
                                position: sticky;
                                top: 4rem;
                                height: auto !important;
                                display: block !important;
                                padding: 0.75rem 0.5rem !important;
                                overflow-x: auto;
                                white-space: nowrap;
                                scroll-width: none;
                                background: rgba(255, 255, 255, 0.8) !important;
                                backdrop-filter: blur(12px);
                                -webkit-backdrop-filter: blur(12px);
                                border-bottom: 1px solid var(--border);
                                z-index: 90;
                                margin-bottom: 1rem !important;
                            }
                            .sidebar-inner { flex-direction: row !important; gap: 0.5rem !important; height: auto !important; }
                            .sidebar-section { padding: 0 !important; }
                            .tab-group { flex-direction: row !important; gap: 0.5rem !important; }
                            .sidebar-item { 
                                margin: 0 !important; 
                                padding: 0.5rem 1rem !important; 
                                background: #f8fafc !important;
                                border: 1px solid var(--border) !important;
                                box-shadow: none !important;
                            }
                            .sidebar-item.active {
                                background: var(--primary) !important;
                                color: white !important;
                                border-color: var(--primary) !important;
                            }
                            .sidebar-item span:last-child { display: block !important; }
                            .sidebar-item div:last-child { display: none !important; }
                        }
                    `}} />

                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Share Section */}
                            <div className="glass-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white' }}>
                                <div className="flex-between mobile-stack" style={{ gap: '2rem', textAlign: 'left' }}>
                                    <div style={{ flex: 1 }}>
                                        <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'white' }}>Share Your Store 🚀</h2>
                                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '1rem' }}>
                                            Your store is live! Share this link with your customers to start accepting orders.
                                        </p>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', overflow: 'hidden' }}>
                                            <code style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{storeLink}</code>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(storeLink); alert('Link copied!'); }}
                                                style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '8px', border: 'none', fontWeight: '700' }}
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '220px' }}>
                                        <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Share</p>
                                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <a href={`https://wa.me/?text=Check%20out%20my%20new%20store%20on%20PostCart!%20${encodeURIComponent(storeLink)}`} target="_blank" className="share-btn" style={{ background: '#25D366', color: 'white', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.049a11.82 11.82 0 001.611 5.973L0 24l6.135-1.61a11.782 11.782 0 005.91 1.586h.005c6.636 0 12.046-5.412 12.05-12.049a11.829 11.829 0 00-3.535-8.503z" /></svg>
                                            </a>
                                            <a href={`https://t.me/share/url?url=${encodeURIComponent(storeLink)}&text=Check%20out%20my%20new%20store%20on%20PostCart!`} target="_blank" className="share-btn" style={{ background: '#0088cc', color: 'white', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.139 1.484-.741 5.025-1.05 6.682-.131.7-.381.934-.631.956-.55.05-1.025-.369-1.562-.719-.841-.55-1.312-.891-2.125-1.425-.941-.619-.331-.956.206-1.512.141-.144 2.581-2.369 2.631-2.581.006-.025.012-.119-.044-.169-.056-.05-.138-.031-.194-.019-.081.019-1.369.875-3.869 2.562-.369.25-.7.375-1 .369-.331-.006-.969-.188-1.444-.344-.581-.194-1.044-.3-1-.631.025-.175.262-.356.712-.544 2.788-1.213 4.65-2.013 5.588-2.4 2.656-1.1 3.206-1.288 3.562-1.294.081 0 .256.019.369.112.094.075.125.175.138.256-.001.037.001.075 0 .112z" /></svg>
                                            </a>
                                            <a href={`mailto:?subject=Check%20out%20my%20store&body=Hi!%20I%20just%20launched%20my%20online%20store%20on%20PostCart.%20Check%20it%20out%20here:%20${encodeURIComponent(storeLink)}`} target="_blank" className="share-btn" style={{ background: '#64748b', color: 'white', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                            </a>
                                            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeLink)}`} target="_blank" className="share-btn" style={{ background: '#1877F2', color: 'white', padding: '0.75rem', borderRadius: '12px', textAlign: 'center', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(236, 72, 153, 0.05))' }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Ready to grow your shop?</h2>
                                <p style={{ color: '#64748b', margin: '0.8rem 0 1.5rem', fontSize: '1rem' }}>Connect your social accounts to automatically sync new products to your store.</p>
                                <div className="flex" style={{ justifyContent: 'center', gap: '1.25rem' }}>
                                    <button className="secondary flex" onClick={() => handleConnect('Instagram')} style={{ gap: '0.6rem', padding: '0.75rem 1.75rem', fontSize: '0.9rem', border: '1px solid #E1306C', color: '#E1306C' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                        <span>Sync Instagram</span>
                                    </button>
                                    <button className="secondary flex" onClick={() => handleConnect('Facebook')} style={{ gap: '0.6rem', padding: '0.75rem 1.75rem', fontSize: '0.9rem', border: '1px solid #1877F2', color: '#1877F2' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        <span>Sync Facebook</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'mystore' && (
                        <div>
                            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                                <h1 style={{ fontSize: '1.75rem' }}>My Live Store</h1>
                                <div className="flex mobile-stack" style={{ gap: '0.75rem' }}>
                                    <div style={{ background: 'var(--input)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }} className="mobile-hide">Store URL:</span>
                                        <code style={{ fontWeight: '600', fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block', overflow: 'hidden' }}>{storeLink}</code>
                                    </div>
                                    <div className="flex" style={{ gap: '0.5rem' }}>
                                        <button className="primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', flex: 1 }} onClick={() => { navigator.clipboard.writeText(storeLink); alert('Link copied!'); }}>Copy</button>
                                        <a href={storeLink} target="_blank" style={{ flex: 1 }}>
                                            <button className="secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', width: '100%' }}>Open ↗</button>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                border: '4px solid #1e293b',
                                borderRadius: '24px',
                                height: '600px',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                position: 'relative'
                            }}>
                                <div style={{ background: '#1e293b', padding: '0.4rem', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }} />
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }} />
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#475569' }} />
                                </div>
                                <iframe
                                    src={storeLink}
                                    style={{ width: '100%', height: 'calc(100% - 20px)', border: 'none' }}
                                    title="Store Preview"
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>Store Analytics</h1>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                                    <p style={{ color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.75rem' }}>Total Revenue</p>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{totalRevenue.toLocaleString()} TSh</h2>
                                </div>
                                <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                                    <p style={{ color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.75rem' }}>Total Orders</p>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{orders.length}</h2>
                                </div>
                                <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                                    <p style={{ color: '#64748b', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.75rem' }}>Active Products</p>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>{products.length}</h2>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '2rem', border: '1px dashed var(--border)', textAlign: 'center' }}>
                                <p style={{ color: '#94a3b8' }}>Advanced charts and visitor tracking coming soon...</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div>
                            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                                <h1 style={{ fontSize: '1.75rem' }}>Product Inventory</h1>
                                <div className="flex" style={{ gap: '1rem' }}>
                                    <button className="secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => setIsManualAddOpen(true)}>+ Add Manually</button>
                                    <button className="primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => handleConnect('Instagram')}>+ Sync Social</button>
                                </div>
                            </div>

                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
                                {products.map(product => (
                                    <div key={product.id} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                                        <img src={product.image} style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                                        <div style={{ padding: '1rem' }}>
                                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>{product.name}</h4>
                                            <div className="flex-between">
                                                <strong style={{ color: 'var(--primary)' }}>{parseFloat(product.price).toLocaleString()} TSh</strong>
                                                <div className="flex" style={{ gap: '0.75rem' }}>
                                                    <button onClick={() => setEditingProduct(product)} style={{ background: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700' }}>Edit</button>
                                                    <button onClick={() => removeProduct(product.id)} style={{ background: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: '700' }}>Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {products.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>No products found. Start by importing from social media!</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div>
                            <h1>Recent Orders</h1>
                            {orders.length === 0 ? (
                                <div className="glass-card" style={{ marginTop: '2rem', padding: '4rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>📦</div>
                                    <h3>No orders yet</h3>
                                    <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Share your store link on social media to start getting sales!</p>
                                </div>
                            ) : (
                                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {orders.map(order => (
                                        <div key={order.id} className="glass-card flex-between" style={{ padding: '1.25rem 2rem' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>Order #{order.id.toString().slice(-5)}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.customerName} • {order.items.length} items</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ color: 'var(--primary)', fontWeight: '800' }}>{parseFloat(order.total).toLocaleString()} TSh</div>
                                                <div className="badge" style={{ background: '#dcfce7', color: '#166534', fontSize: '0.7rem' }}>Paid</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div style={{ maxWidth: '600px' }}>
                            <h1>Store Settings</h1>
                            <div className="glass-card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600' }}>Store Layout</label>
                                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div
                                            onClick={() => setSettings({ ...settings, layout: 'grid' })}
                                            style={{
                                                padding: '1.25rem', borderRadius: '16px', border: settings.layout === 'grid' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                cursor: 'pointer', background: settings.layout === 'grid' ? 'rgba(99, 102, 241, 0.05)' : 'white', transition: 'all 0.2s'
                                            }}>
                                            <div style={{ fontWeight: '700', marginBottom: '0.4rem' }}>Classic Grid</div>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>Best for large catalogs and high-end storefronts.</p>
                                        </div>
                                        <div
                                            onClick={() => setSettings({ ...settings, layout: 'link' })}
                                            style={{
                                                padding: '1.25rem', borderRadius: '16px', border: settings.layout === 'link' ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                cursor: 'pointer', background: settings.layout === 'link' ? 'rgba(99, 102, 241, 0.05)' : 'white', transition: 'all 0.2s'
                                            }}>
                                            <div style={{ fontWeight: '700', marginBottom: '0.4rem' }}>Link-in-Bio</div>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>Optimized for mobile social traffic. Tall, sleek, and fast.</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Store Name</label>
                                    <input type="text" value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Primary Brand Color</label>
                                    <div className="flex" style={{ gap: '1rem' }}>
                                        <input type="color" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} style={{ width: '60px', height: '45px', padding: '2px', cursor: 'pointer' }} />
                                        <input type="text" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} style={{ flex: 1 }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Contact Email</label>
                                    <input type="email" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} placeholder="seller@example.com" />
                                </div>
                                <button className="primary" onClick={saveSettings} style={{ width: 'fit-content' }}>Save Identity Changes</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* AI Import Modal Hook */}
            {isImportModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass-card" style={{
                        width: '100%', maxWidth: '800px', background: 'white',
                        padding: '0', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column'
                    }}>
                        {/* Modal Header */}
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem' }}>Import from {activePlatform}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    {importStep === 'accounts' && 'Select your business account'}
                                    {importStep === 'posts' && 'Select the posts you want to sell'}
                                    {importStep === 'refine' && 'Refine your product details'}
                                </p>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'none', fontSize: '1.5rem', color: '#94a3b8' }}>✕</button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '2rem', overflowY: 'auto' }}>
                            {importStep === 'accounts' && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.5rem',
                                        background: activePlatform === 'Instagram' ? 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' : '#1877F2',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                    }}>
                                        {activePlatform === 'Instagram' ? (
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                        ) : (
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        )}
                                    </div>
                                    <h4 style={{ marginBottom: '1rem' }}>Connect your {activePlatform} Profile</h4>
                                    <div style={{ maxWidth: '450px', margin: '0 auto 2rem' }}>
                                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                                            Postcart AI will securely connect to your official media feed to find products, prices, and descriptions automatically.
                                        </p>
                                    </div>
                                    <button
                                        className="primary"
                                        onClick={handleStartAssessment}
                                        disabled={isAssessing}
                                        style={{ padding: '0.8rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0 auto' }}
                                    >
                                        {isAssessing ? (
                                            <>
                                                <div className="spinner-small" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Syncing Live Media...
                                            </>
                                        ) : (
                                            <>Connect & Sync Real Media 🚀</>
                                        )}
                                    </button>
                                    <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
                                </div>
                            )}

                            {importStep === 'posts' && (
                                <div>
                                    {socialFeed.length > 0 ? (
                                        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                            {socialFeed.map(post => (
                                                <div
                                                    key={post.id}
                                                    onClick={() => togglePostSelection(post)}
                                                    style={{
                                                        position: 'relative', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                                                        aspectRatio: '1', border: selectedPosts.find(p => p.id === post.id) ? '4px solid var(--primary)' : 'none'
                                                    }}>
                                                    <img src={post.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    {selectedPosts.find(p => p.id === post.id) && (
                                                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--primary)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🔍</div>
                                            <h4 style={{ marginBottom: '0.5rem' }}>No product posts found</h4>
                                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                                                Our AI couldn't find posts with clear prices. Try a different username or check your privacy settings.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {importStep === 'refine' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <style dangerouslySetInnerHTML={{
                                        __html: `
                                        @media (max-width: 600px) {
                                            .refine-row { flex-direction: column !important; }
                                            .refine-row img { width: 100% !important; height: 200px !important; }
                                            .refine-inputs { grid-template-columns: 1fr !important; }
                                        }
                                    `}} />
                                    {selectedPosts.map((post, idx) => (
                                        <div key={post.id} className="refine-row" style={{
                                            display: 'flex', gap: '1.5rem', background: '#f8fafc',
                                            padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)',
                                            alignItems: 'flex-start'
                                        }}>
                                            <img src={post.image} style={{ width: '120px', height: '120px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '1rem' }} className="refine-inputs">
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Product Name</label>
                                                        <input
                                                            type="text"
                                                            value={post.name}
                                                            style={{ width: '100%' }}
                                                            onChange={(e) => {
                                                                const updated = [...selectedPosts];
                                                                updated[idx].name = e.target.value;
                                                                setSelectedPosts(updated);
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Price (TSh)</label>
                                                        <input
                                                            type="text"
                                                            value={post.price}
                                                            style={{ width: '100%' }}
                                                            onChange={(e) => {
                                                                const updated = [...selectedPosts];
                                                                updated[idx].price = e.target.value;
                                                                setSelectedPosts(updated);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Description (Extracted from Caption)</label>
                                                    <textarea
                                                        value={post.caption}
                                                        style={{
                                                            width: '100%', minHeight: '80px', borderRadius: '12px',
                                                            padding: '0.75rem', border: '1px solid var(--border)',
                                                            fontSize: '0.85rem', lineHeight: '1.5', background: 'white'
                                                        }}
                                                        onChange={(e) => {
                                                            const updated = [...selectedPosts];
                                                            updated[idx].caption = e.target.value;
                                                            setSelectedPosts(updated);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            {importStep === 'posts' && (
                                <button className="primary" onClick={confirmSelection} disabled={selectedPosts.length === 0} style={{ opacity: selectedPosts.length === 0 ? 0.5 : 1 }}>
                                    Continue with {selectedPosts.length} selected
                                </button>
                            )}
                            {importStep === 'refine' && (
                                <>
                                    <button className="secondary" onClick={() => setImportStep('posts')}>Back</button>
                                    <button className="primary" onClick={finalizeImport}>Complete Import</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Product Editor Modal */}
            {editingProduct && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
                    zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', background: 'white', padding: '2rem' }}>
                        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                            <h3>Edit Product</h3>
                            <button onClick={() => setEditingProduct(null)} style={{ background: 'none', fontSize: '1.25rem' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>PRODUCT NAME</label>
                                <input
                                    type="text"
                                    value={editingProduct.name}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>PRICE (TSh)</label>
                                <input
                                    type="text"
                                    value={editingProduct.price}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>PRODUCT IMAGE</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <img src={editingProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                    <button
                                        className="secondary flex"
                                        onClick={() => handleEnhance(editingProduct.image, 'edit')}
                                        disabled={isEnhancing}
                                        style={{ gap: '0.5rem', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #7dd3fc', color: '#0369a1' }}
                                    >
                                        <span>{isEnhancing ? 'Enhancing...' : 'Magic Studio ✨'}</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>DESCRIPTION</label>
                                <textarea
                                    value={editingProduct.description}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                    style={{ width: '100%', minHeight: '100px', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--border)' }}
                                />
                            </div>
                            <div className="flex" style={{ gap: '1rem', marginTop: '1rem' }}>
                                <button className="secondary" onClick={() => setEditingProduct(null)} style={{ flex: 1 }}>Cancel</button>
                                <button className="primary" onClick={() => updateProduct(editingProduct)} style={{ flex: 1 }}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Add Modal */}
            {isManualAddOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
                    zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', background: 'white', padding: '2rem' }}>
                        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                            <h3>Add New Product</h3>
                            <button onClick={() => setIsManualAddOpen(false)} style={{ background: 'none', fontSize: '1.25rem' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>PRODUCT NAME</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Vintage Denim Jacket"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>PRICE (TSh)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 50000"
                                    value={newProduct.price}
                                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>PRODUCT IMAGE</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                                    <img src={newProduct.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                            id="product-upload"
                                        />
                                        <label htmlFor="product-upload" style={{
                                            display: 'inline-block', padding: '0.5rem 1rem', background: '#f1f5f9',
                                            borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                                            border: '1px solid var(--border)'
                                        }}>
                                            {isUploading ? 'Uploading...' : 'Choose from Gallery 🖼️'}
                                        </label>
                                    </div>
                                    <button
                                        className="secondary flex"
                                        onClick={() => handleEnhance(newProduct.image, 'new')}
                                        disabled={isEnhancing || isUploading}
                                        style={{ gap: '0.5rem', background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #7dd3fc', color: '#0369a1' }}
                                    >
                                        <span>{isEnhancing ? 'Processing...' : 'Magic Studio ✨'}</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Or paste image URL..."
                                    value={newProduct.image}
                                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: '800' }}>DESCRIPTION</label>
                                <textarea
                                    placeholder="Describe your product..."
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                    style={{ width: '100%', minHeight: '80px', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--border)' }}
                                />
                            </div>
                            <div className="flex" style={{ gap: '1rem', marginTop: '1rem' }}>
                                <button className="secondary" onClick={() => setIsManualAddOpen(false)} style={{ flex: 1 }}>Cancel</button>
                                <button className="primary" onClick={handleManualAdd} style={{ flex: 1 }}>Add to Store</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
