"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const isDashboard = pathname.startsWith('/dashboard');
    const isBuyerPage = pathname.startsWith('/store') || pathname === '/checkout';

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const handleLoginClick = (e) => {
        if (user) {
            e.preventDefault();
            router.push('/dashboard');
        }
    };

    if (isBuyerPage) return null;

    return (
        <nav className="navbar" style={{
            padding: '0.75rem 0',
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            position: 'sticky',
            top: 0,
            zIndex: 1000
        }}>
            <div className="container flex-between" style={{ width: '100%' }}>
                <Link href="/">
                    <div className="flex" style={{ gap: '0.9rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            position: 'relative',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
                        }}>
                            <img src="/icon.png" alt="PostCart Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.04em', color: '#0f172a' }}>PostCart</span>
                    </div>
                </Link>

                <div className="flex" style={{ gap: '2.5rem' }}>
                    {loading ? (
                        <div style={{ width: '20px', height: '20px', border: '2px solid #f3f3f3', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : user ? (
                        <>
                            {!isDashboard && <Link href="/dashboard" style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.01em' }}>Go to Dashboard</Link>}
                        </>
                    ) : (
                        <>
                            <Link href="/#features" style={{ fontSize: '0.9rem', fontWeight: '700', color: '#64748b' }} className="mobile-hide">Features</Link>
                            <Link href="/login" style={{ fontSize: '0.9rem', fontWeight: '700', color: '#64748b' }}>Login</Link>
                            <Link href="/signup">
                                <button className="primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', borderRadius: '10px' }}>Get Started</button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
