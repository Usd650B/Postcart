"use client";
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StoreNavbar from '@/components/StoreNavbar';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function StorePage({ params: paramsPromise }) {
    const params = use(paramsPromise);
    const sellerId = params.sellerId;

    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [sellerName, setSellerName] = useState('Social Shop');
    const [layout, setLayout] = useState('grid');

    useEffect(() => {
        if (!sellerId) return;

        // Real-time listener for products and settings from the seller's cloud doc
        const sellerRef = doc(db, "sellers", sellerId === "my-social-shop" ? "default-seller" : sellerId);

        const unsubscribe = onSnapshot(sellerRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.settings) {
                    setSellerName(data.settings.storeName || 'Social Shop');
                    setLayout(data.settings.layout || 'grid');
                    if (data.settings.primaryColor) {
                        document.documentElement.style.setProperty('--primary', data.settings.primaryColor);
                    }
                }
                if (data.products) {
                    setProducts(data.products);
                }
            } else {
                // If no cloud data yet, show a friendly empty state or simple defaults
                setProducts([]);
            }
        }, (err) => {
            console.error("Firebase store fetch failed", err);
        });

        // Initialize cart from local storage
        const savedCart = localStorage.getItem('postcart_cart');
        if (savedCart) setCart(JSON.parse(savedCart));

        return () => unsubscribe();
    }, [sellerId]);

    const addToCart = (product) => {
        const newCart = [...cart, product];
        setCart(newCart);
        localStorage.setItem('postcart_cart', JSON.stringify(newCart));
        setShowCart(true);
    };

    const removeFromCart = (index) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
        localStorage.setItem('postcart_cart', JSON.stringify(newCart));
    };

    const total = cart.reduce((acc, item) => acc + parseFloat(item.price), 0);

    return (
        <div>
            <StoreNavbar cartCount={cart.length} onCartClick={() => setShowCart(true)} sellerName={sellerName} />

            <div className={`store-container ${layout === 'link' ? 'layout-link' : 'layout-grid'}`}>
                <header className="store-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    {layout === 'link' ? (
                        <div className="profile-section" style={{ padding: '1rem 0' }}>
                            <div className="profile-avatar" style={{
                                width: '100px', height: '100px', borderRadius: '50%',
                                background: 'var(--primary)', margin: '0 auto 1.25rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '2.5rem', fontWeight: '800',
                                boxShadow: '0 10px 30px rgba(99, 102, 241, 0.2)',
                                border: '4px solid white'
                            }}>
                                {sellerName.charAt(0)}
                            </div>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem', fontWeight: '900' }}>{sellerName}</h1>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <span className="badge" style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem' }}>verified_merch</span>
                                <span className="badge" style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem' }}>social_sync</span>
                            </div>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto', lineHeight: '1.5' }}>
                                ✨ Shop my latest drops directly from my social feed. Limited stock available.
                            </p>
                        </div>
                    ) : (
                        <div style={{ padding: '2rem 1.25rem' }}>
                            <div className="badge badge-primary" style={{ marginBottom: '0.75rem', fontSize: '0.65rem', textTransform: 'uppercase' }}>Official Store</div>
                            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', letterSpacing: '-0.04em', fontWeight: '900' }}>{sellerName}</h1>
                            <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
                                Discover curated products handpicked from our social community.
                            </p>
                        </div>
                    )}
                </header>

                <div className="product-list">
                    {products.map(product => (
                        <div key={product.id} className="product-card-wrapper">
                            {layout === 'link' ? (
                                <div className="link-product-card glass-card" style={{ padding: '0.4rem', display: 'flex', gap: '0.85rem', alignItems: 'center', borderRadius: '18px', marginBottom: '0.5rem', border: '1px solid rgba(0,0,0,0.03)' }}>
                                    <img src={product.image} style={{ width: '65px', height: '65px', borderRadius: '14px', objectFit: 'cover' }} />
                                    <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                                        <h3 style={{ fontSize: '0.85rem', marginBottom: '0.1rem', fontWeight: '800' }}>{product.name}</h3>
                                        <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem', height: '1rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.description}</p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--primary)' }}>{parseFloat(product.price).toLocaleString()} TSh</p>
                                    </div>
                                    <button className="primary" onClick={() => addToCart(product)} style={{ borderRadius: '12px', padding: '0.6rem 1rem', fontSize: '0.75rem', fontWeight: '800' }}>Add</button>
                                </div>
                            ) : (
                                <div className="grid-product-card glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden' }}>
                                        <img src={product.image} alt={product.name} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.08)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'} />
                                    </div>
                                    <div style={{ padding: '0.75rem 0.85rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ marginBottom: '0.2rem', fontSize: '0.85rem', fontWeight: '700' }}>{product.name}</h3>
                                        <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.75rem', height: '28px', overflow: 'hidden', lineHeight: '1.3' }}>{product.description}</p>
                                        <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '0.6rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                            <span style={{ fontSize: '0.95rem', fontWeight: '900' }}>{parseFloat(product.price).toLocaleString()} TSh</span>
                                            <button className="primary" onClick={() => addToCart(product)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', fontWeight: '700' }}>Add</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .store-container {
                        padding: 2rem 1rem;
                        margin: 0 auto;
                        min-height: 80vh;
                        max-width: var(--container-width);
                    }
                    .layout-link {
                        max-width: 500px !important;
                    }
                    .product-list {
                        display: grid;
                        gap: 1.5rem;
                    }
                    .layout-grid .product-list {
                        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    }
                    .layout-link .product-list {
                        grid-template-columns: 1fr;
                        gap: 0.75rem;
                    }
                    @media (max-width: 480px) {
                        .layout-grid .product-list {
                            grid-template-columns: repeat(2, 1fr);
                            gap: 1rem;
                        }
                        .layout-grid .product-card-wrapper:last-child:nth-child(odd) {
                            grid-column: span 2;
                        }
                        .store-header h1 {
                            font-size: 1.75rem !important;
                        }
                    }
                `}} />

                {showCart && (
                    <div style={{
                        position: 'fixed', right: 0, top: 0, height: '100vh', width: '100%', maxWidth: '400px',
                        background: 'white', boxShadow: '-15px 0 40px rgba(0,0,0,0.15)', zIndex: 100,
                        padding: '2.5rem', display: 'flex', flexDirection: 'column'
                    }}>
                        <div className="flex-between" style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem' }}>Your Bag</h2>
                            <button onClick={() => setShowCart(false)} style={{ background: 'none', fontSize: '1.25rem', color: '#94a3b8' }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {cart.length === 0 ? (
                                <div style={{ textAlign: 'center', marginTop: '5rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🛍️</div>
                                    <h3 style={{ fontSize: '1.1rem' }}>Your bag is empty</h3>
                                    <p style={{ color: '#64748b', marginTop: '0.4rem', fontSize: '0.85rem' }}>Add items you love from the store!</p>
                                </div>
                            ) : (
                                cart.map((item, index) => (
                                    <div key={index} className="flex" style={{ marginBottom: '2rem', gap: '1rem', alignItems: 'flex-start' }}>
                                        <img src={item.image} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem' }}>{item.name}</h4>
                                            <p style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>{parseFloat(item.price).toLocaleString()} TSh</p>
                                        </div>
                                        <button onClick={() => removeFromCart(index)} style={{ background: 'none', color: '#94a3b8', fontSize: '0.75rem' }}>Remove</button>
                                    </div>
                                ))
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '1rem' }}>
                                <div className="flex-between" style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: '800' }}>
                                    <span>Total</span>
                                    <span>{total.toLocaleString()} TSh</span>
                                </div>
                                <Link href="/checkout">
                                    <button className="primary" style={{ width: '100%', padding: '1.1rem', fontSize: '1rem' }}>Checkout Now</button>
                                </Link>
                                <button
                                    className="secondary"
                                    style={{ width: '100%', marginTop: '1rem', border: 'none', fontSize: '0.9rem' }}
                                    onClick={() => setShowCart(false)}
                                >
                                    Continue Shopping
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {showCart && <div onClick={() => setShowCart(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 90 }} />}
            </div>
        </div>
    );
}
