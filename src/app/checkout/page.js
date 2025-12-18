"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StoreNavbar from '@/components/StoreNavbar';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function Checkout() {
    const [cart, setCart] = useState([]);
    const [customerInfo, setCustomerInfo] = useState({ firstName: '', lastName: '', address: '', city: '', zip: '' });
    const [step, setStep] = useState(1);
    const router = useRouter();

    useEffect(() => {
        const savedCart = localStorage.getItem('postcart_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
    }, []);

    const handleFinish = async (e) => {
        e.preventDefault();
        const total = cart.reduce((acc, item) => acc + parseFloat(item.price), 0);

        const newOrder = {
            id: Date.now(),
            customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
            items: cart,
            total: total.toFixed(2),
            timestamp: new Date().toISOString()
        };

        try {
            const sellerRef = doc(db, "sellers", "default-seller");
            const docSnap = await getDoc(sellerRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const updatedOrders = [newOrder, ...(data.orders || [])];
                await updateDoc(sellerRef, { orders: updatedOrders });
            }

            setStep(3);
            localStorage.removeItem('postcart_cart');

            setTimeout(() => {
                router.push('/store/my-social-shop');
            }, 6000);
        } catch (err) {
            console.error("Order failed", err);
            alert('Failed to place order. Please try again.');
        }
    };

    return (
        <div>
            <StoreNavbar sellerName="Checkout" />
            <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px' }}>
                <div className="glass-card" style={{ padding: '2rem' }}>
                    {step === 1 && (
                        <>
                            <div className="flex-between" style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <span style={{ fontWeight: '600' }}>Order Total</span>
                                <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.2rem' }}>
                                    {cart.reduce((acc, item) => acc + parseFloat(item.price), 0).toLocaleString()} TSh
                                </span>
                            </div>
                            <h2 style={{ marginBottom: '2rem' }}>Shipping Information</h2>
                            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="flex mobile-stack" style={{ gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>First Name</label>
                                        <input type="text" value={customerInfo.firstName} onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })} required />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Last Name</label>
                                        <input type="text" value={customerInfo.lastName} onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })} required />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Address</label>
                                    <input type="text" value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} required />
                                </div>
                                <div className="flex mobile-stack" style={{ gap: '1rem' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>City</label>
                                        <input type="text" value={customerInfo.city} onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })} required />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>ZIP Code</label>
                                        <input type="text" value={customerInfo.zip} onChange={(e) => setCustomerInfo({ ...customerInfo, zip: e.target.value })} required />
                                    </div>
                                </div>
                                <button type="button" className="primary" style={{ width: '100%', padding: '1.2rem' }} onClick={() => setStep(2)}>Continue to Payment</button>
                            </form>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 style={{ marginBottom: '1rem' }}>Payment Method</h2>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '2rem' }}>Safe and secure payments via Mobile Money or Card</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                                <div style={{
                                    padding: '1.25rem', borderRadius: '16px', border: '2px solid #85bb65',
                                    background: 'rgba(133, 187, 101, 0.05)', textAlign: 'center', cursor: 'pointer'
                                }}>
                                    <div style={{ fontWeight: '900', color: '#85bb65', marginBottom: '0.25rem' }}>M-PESA</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Vodacom</div>
                                </div>
                                <div style={{
                                    padding: '1.25rem', borderRadius: '16px', border: '2px solid #005aa9',
                                    background: 'rgba(0, 90, 169, 0.05)', textAlign: 'center', cursor: 'pointer'
                                }}>
                                    <div style={{ fontWeight: '900', color: '#005aa9', marginBottom: '0.25rem' }}>TIGO PESA</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Tigo</div>
                                </div>
                            </div>

                            <form onSubmit={handleFinish} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', background: '#f8fafc' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontWeight: '700', fontSize: '0.9rem' }}>
                                        <input type="radio" checked readOnly /> Credit / Debit Card
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600' }}>Card Number</label>
                                            <input type="text" placeholder="xxxx xxxx xxxx xxxx" required />
                                        </div>
                                        <div className="flex mobile-stack" style={{ gap: '1rem' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600' }}>Expiry Date</label>
                                                <input type="text" placeholder="MM/YY" required />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '600' }}>CVV</label>
                                                <input type="password" placeholder="***" required />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" className="primary" style={{ width: '100%', padding: '1.2rem' }}>Complete Purchase</button>
                                <button type="button" className="secondary" style={{ width: '100%' }} onClick={() => setStep(1)}>Go Back</button>
                            </form>
                        </>
                    )}

                    {step === 3 && (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🌿</div>
                            <h2 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Order Placed!</h2>
                            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Thank you for shopping at our social store. Your order is being processed.</p>
                            <div style={{ marginTop: '3rem' }}>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem' }}>Returning to the shop...</p>
                                <div className="loading-spinner" style={{
                                    width: '30px', height: '30px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--primary)',
                                    borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite'
                                }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
