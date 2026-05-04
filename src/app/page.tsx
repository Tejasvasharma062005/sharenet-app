import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HeartHandshake, ArrowRight, ShieldCheck, MapPin, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Navigation */}
      <header className="px-6 py-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 text-[var(--color-urgency-orange)]">
          <HeartHandshake size={28} />
          <span className="text-xl font-bold tracking-tight text-foreground">ShareNet</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-[var(--color-urgency-orange)] hover:bg-[#e65c2b] text-white">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[var(--color-urgency-orange)]/20 to-[var(--color-action-green)]/20 blur-3xl rounded-full -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-action-green)]/10 text-[var(--color-action-green)] text-sm font-semibold mb-8 animate-fade-in-up">
          <Zap size={16} />
          <span>Real-time surplus redistribution</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-balance leading-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          Bridge the gap between <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-urgency-orange)] to-[#f39c12]">surplus</span> and <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-action-green)] to-[#27ae60]">scarcity</span>.
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 text-balance animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          ShareNet connects generous donors, dedicated NGOs, and passionate volunteers to ensure resources reach those who need them most—fast and securely.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-[var(--color-action-green)] hover:bg-[#27ae60] text-white text-lg h-14 px-8 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              Join the Movement <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-5xl text-left w-full">
          <div className="bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-[var(--color-urgency-orange)]/10 text-[var(--color-urgency-orange)] rounded-xl flex items-center justify-center mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Urgent Drops</h3>
            <p className="text-muted-foreground">Instantly alert nearby NGOs and volunteers about perishable goods that need immediate pickup.</p>
          </div>
          
          <div className="bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-4">
              <MapPin size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Logistics</h3>
            <p className="text-muted-foreground">Interactive map routing helps volunteers find the fastest paths for pickup and delivery.</p>
          </div>
          
          <div className="bg-card p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-[var(--color-action-green)]/10 text-[var(--color-action-green)] rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Secure Handoffs</h3>
            <p className="text-muted-foreground">QR code verification ensures that resources reach the verified recipients safely.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12 px-6 mt-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-left">
            <div className="flex items-center gap-2 text-[var(--color-urgency-orange)]">
              <HeartHandshake size={28} />
              <span className="text-2xl font-bold tracking-tight text-foreground">ShareNet</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Empowering communities by connecting surplus resources with those who need them most. Fast, secure, and reliable.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4 text-sm font-medium">
            <Link href="#" className="text-muted-foreground hover:text-[var(--color-urgency-orange)] transition-colors">About Us</Link>
            <Link href="#" className="text-muted-foreground hover:text-[var(--color-urgency-orange)] transition-colors">Contact</Link>
            <Link href="#" className="text-muted-foreground hover:text-[var(--color-urgency-orange)] transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-muted-foreground hover:text-[var(--color-urgency-orange)] transition-colors">Terms of Service</Link>
          </div>
        </div>
        
        <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-border/50 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ShareNet. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="text-xs text-muted-foreground">Building a zero-hunger world.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
