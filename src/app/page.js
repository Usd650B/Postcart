"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAction = (e, path) => {
    if (user) {
      e.preventDefault();
      router.push('/dashboard');
    }
  };

  return (
    <div className="container" style={{ overflowX: 'hidden' }}>
      {/* Hero Section */}
      <section style={{
        padding: '8rem 0 6rem',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
          zIndex: -1,
          filter: 'blur(60px)'
        }} />

        <div className="badge badge-primary" style={{
          marginBottom: '2rem',
          padding: '0.6rem 1.25rem',
          fontSize: '0.9rem',
          letterSpacing: '0.05em',
          fontWeight: '700'
        }}>
          ✨ POWERED BY POSTCART AI
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          lineHeight: '1.05',
          marginBottom: '1.75rem',
          fontWeight: '900',
          letterSpacing: '-0.03em'
        }}>
          Turn Social Media into <br />
          <span style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>Your Global Storefront.</span>
        </h1>

        <p style={{
          fontSize: '1.25rem',
          color: '#475569',
          maxWidth: '800px',
          margin: '0 auto 3.5rem',
          lineHeight: '1.6',
          fontWeight: '500'
        }}>
          Stop managing inventory manually. PostCart AI extracts product details from your posts and builds a professional TSh store in seconds. Support for M-Pesa & Tigo-Pesa built-in.
        </p>

        <div className="flex mobile-stack" style={{ justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
          <Link href="/signup" onClick={(e) => handleAction(e, '/signup')}>
            <button className="primary" style={{ padding: '1.1rem 2.5rem', fontSize: '1.1rem', borderRadius: '14px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)' }}>
              Get Started for Free
            </button>
          </Link>
          <Link href="/store/vintage-vault">
            <button className="secondary" style={{ padding: '1.1rem 2.5rem', fontSize: '1.1rem', borderRadius: '14px' }}>
              View Live Demo
            </button>
          </Link>
        </div>

        {/* Hero Image / Dashboard Preview */}
        <div style={{
          padding: '1rem',
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <img
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80"
            alt="PostCart Dashboard Preview"
            style={{ width: '100%', borderRadius: '16px', display: 'block' }}
          />
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: '800', marginBottom: '3rem' }}>
          TRUSTED BY INNOVATIVE SELLERS WORLDWIDE
        </p>
        <div className="flex" style={{ justifyContent: 'center', gap: '4rem', opacity: 0.6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>FashionHub</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>VintageVault</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>ArtDeco</span>
          <span style={{ fontSize: '1.5rem', fontWeight: '900' }}>TechTrend</span>
        </div>
      </section>

      {/* AI Features Grid */}
      <section id="features" style={{ padding: '8rem 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: '900', marginBottom: '1rem' }}>Selling has never been this smart</h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Designed to save you hours of manual work every single day.</p>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
          <div className="glass-card" style={{ padding: '3rem' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>AI Product Extraction</h3>
            <p style={{ color: '#64748b', lineHeight: '1.7' }}>Our Gemini-powered AI scans your captions to automatically identify items, prices, and specifications. No more manual data entry.</p>
          </div>

          <div className="glass-card" style={{ padding: '3rem' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Magic Studio ✨</h3>
            <p style={{ color: '#64748b', lineHeight: '1.7' }}>Clean up messy social photos instantly. Our Vision AI removes distractions and places your products in a premium white studio environment.</p>
          </div>

          <div className="glass-card" style={{ padding: '3rem' }}>
            <div style={{ width: '56px', height: '56px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>Seamless Checkout</h3>
            <p style={{ color: '#64748b', lineHeight: '1.7' }}>Convert followers into buyers without them ever leaving your universe. Fast, secure, and optimized for mobile creators.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '8rem 0', textAlign: 'center' }}>
        <div className="glass-card hero-gradient" style={{
          padding: '5rem 3rem',
          borderRadius: '40px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white'
        }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1.5rem', fontWeight: '900' }}>Ready to automate your sales?</h2>
          <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '3.5rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
            Join thousand of creators who have turned their social presence into a revenue-generating machine with PostCart AI.
          </p>
          <div className="flex" style={{ justifyContent: 'center', gap: '1.5rem' }}>
            <Link href="/signup" onClick={(e) => handleAction(e, '/signup')}>
              <button className="primary" style={{ padding: '1.25rem 3.5rem', fontSize: '1.1rem', borderRadius: '14px' }}>
                Create Your Store Now
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '6rem 0 4rem',
        borderTop: '1px solid var(--border)',
        color: '#64748b'
      }}>
        <div className="flex mobile-stack" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '2rem' }}>
          <div className="flex" style={{ gap: '0.9rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', overflow: 'hidden' }}>
              <img src="/icon.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b' }}>PostCart</span>
          </div>
          <div className="flex" style={{ gap: '2.5rem' }}>
            <Link href="/#features" style={{ fontSize: '0.9rem', fontWeight: '600' }}>Features</Link>
            <Link href="/login" style={{ fontSize: '0.9rem', fontWeight: '600' }}>Pricing</Link>
            <Link href="/signup" style={{ fontSize: '0.9rem', fontWeight: '600' }}>Community</Link>
          </div>
        </div>
        <div style={{ marginTop: '4rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          © 2025 PostCart AI. The future of social commerce.
        </div>
      </footer>

      <style jsx>{`
        .mobile-stack {
          @media (max-width: 768px) {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
