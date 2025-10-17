import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/context/auth";
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import Link from 'next/link'; // Import the Link component

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CredX",
  description: "",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Navbar />
            {children}
            {/* Footer */}
            <footer className="py-16 px-6 bg-muted text-center">
              <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-foreground mb-4">
                      CredX
                    </h3>
                    <p className="text-muted-foreground">
                      Amplify articles, earn credits, engage readers.
                    </p>
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-semibold text-foreground mb-4">
                      Company
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>
                        <Link
                          href="/about"
                          className="hover:text-primary transition-colors"
                        >
                          About Us
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/careers"
                          className="hover:text-primary transition-colors"
                        >
                          Careers
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/contact"
                          className="hover:text-primary transition-colors"
                        >
                          Contact
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-semibold text-foreground mb-4">
                      Resources
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>
                        <Link
                          href="/help"
                          className="hover:text-primary transition-colors"
                        >
                          Help Center
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="#"
                          className="hover:text-primary transition-colors"
                        >
                          API Docs
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-semibold text-foreground mb-4">
                      Follow Us
                    </h4>
                    <div className="flex space-x-4">
                      {/* External links correctly use <a> tags */}
                      <a
                        href="https://github.com/vedantjain8"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                      </a>
                      <a
                        href="https://www.linkedin.com/in/vedantjain8"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn profile"
                        className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.036-1.85-3.036-1.853 0-2.136 1.446-2.136 2.941v5.664h-3.554V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.604 0 4.271 2.373 4.271 5.456v6.285zM5.337 7.433c-1.144 0-2.069-.926-2.069-2.069 0-1.144.925-2.069 2.069-2.069s2.069.925 2.069 2.069c0 1.143-.925 2.069-2.069 2.069zM7.119 20.452H3.554V9h3.565v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.728v20.543C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.728C24 .774 23.2 0 22.225 0z" />
                        </svg>
                      </a>
                      <a
                        href="https://www.linkedin.com/in/dheeraj-s-menon"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn company"
                        className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.036-1.85-3.036-1.853 0-2.136 1.446-2.136 2.941v5.664h-3.554V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.604 0 4.271 2.373 4.271 5.456v6.285zM5.337 7.433c-1.144 0-2.069-.926-2.069-2.069 0-1.144.925-2.069 2.069-2.069s2.069.925 2.069 2.069c0 1.143-.925 2.069-2.069 2.069zM7.119 20.452H3.554V9h3.565v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.728v20.543C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.728C24 .774 23.2 0 22.225 0z" />
                        </svg>
                      </a>
                      <a
                        href="https://github.com/Dheeraj585"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="border-t border-muted-foreground/20 pt-8">
                  <p className="text-muted-foreground">
                    &copy; 2023 CredX. All rights reserved.
                  </p>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}