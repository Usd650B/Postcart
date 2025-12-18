"use client";
import Link from 'next/link';

export default function StoreNavbar({ cartCount, onCartClick, sellerName = "PostCart Store" }) {
    return (
        <nav className="navbar navbar-store container">
            <div className="flex" style={{ gap: '0.75rem' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                    <img src="/icon.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.02em' }}>{sellerName}</span>
            </div>

            <div className="flex" style={{ gap: '1.5rem' }}>
                {onCartClick && (
                    <button className="flex" onClick={onCartClick} style={{ gap: '0.6rem', background: 'none', color: 'var(--foreground)', padding: '0.5rem 0.75rem', borderRadius: '10px', transition: 'background 0.2s' }}>
                        <span style={{ fontSize: '1.1rem' }}>👜</span>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Bag ({cartCount})</span>
                    </button>
                )}
            </div>
        </nav>
    );
}
