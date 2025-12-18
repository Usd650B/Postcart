import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "PostCart - AI Powered Social Commerce",
  description: "Turn your Instagram and Facebook posts into a full e-commerce store automatically with AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="hero-gradient">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
