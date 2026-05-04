import React from 'react';
import { HeartHandshake } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-[1000px] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border">
        
        {/* Left Side: Branding / Image */}
        <div className="hidden md:flex md:w-1/2 bg-[var(--color-urgency-orange)] p-12 flex-col justify-between text-white relative overflow-hidden">
          {/* Background pattern or gradient can go here */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-urgency-orange)] to-[#cc4918] opacity-90" />
          
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2 mb-12">
              <HeartHandshake size={32} className="text-white" />
              <span className="text-2xl font-bold tracking-tight">ShareNet</span>
            </Link>
            
            <h1 className="text-4xl font-extrabold mb-4 leading-tight">
              Bridge the gap between surplus and scarcity.
            </h1>
            <p className="text-lg opacity-90">
              Join our community of donors, NGOs, and volunteers making a real difference today.
            </p>
          </div>
          
          <div className="relative z-10 text-sm font-medium opacity-80">
            © {new Date().getFullYear()} ShareNet. All rights reserved.
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
