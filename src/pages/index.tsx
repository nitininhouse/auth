import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import CivicConnectWallet from '@/components/CivicConnectWallet';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-green-400 rounded-full opacity-20 animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );

  const GlowCard = ({
    children,
    className = "",
    delay = 0,
  }: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
  }) => (
    <div 
      className={`group relative bg-gradient-to-br from-gray-900 to-black border border-green-500/20 rounded-2xl p-8 hover:border-green-400/40 transition-all duration-700 hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-2 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );

  const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      const timer = setTimeout(() => {
        const increment = target / 100;
        const interval = setInterval(() => {
          setCount(prev => {
            if (prev < target) {
              return Math.min(prev + increment, target);
            }
            clearInterval(interval);
            return target;
          });
        }, 20);
        return () => clearInterval(interval);
      }, 500);
      
      return () => clearTimeout(timer);
    }, [target]);

    return (
      <span className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
        {Math.floor(count)}{suffix}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <Head>
        <title>ZK Carbon - Decentralized Carbon Credit Marketplace</title>
        <meta name="description" content="Empowering organizations to contribute to a sustainable future through verifiable tree plantation and carbon credit trading." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 md:px-12">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent" />
        <FloatingParticles />
        
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), 
                             linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            animation: 'grid-move 20s linear infinite'
          }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="overflow-hidden">
              <h1 className="text-5xl md:text-7xl font-black leading-tight animate-fade-in-up">
                <span className="block text-white">Decentralized</span>
                <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
                  Carbon Credit
                </span>
                <span className="block text-white">Marketplace</span>
              </h1>
            </div>
            
            <div className="overflow-hidden">
              <p className="text-xl text-gray-300 leading-relaxed animate-fade-in-up animation-delay-300 max-w-lg">
                Empowering organizations to contribute to a sustainable future through 
                <span className="text-green-400 font-semibold"> verifiable tree plantation</span> and 
                <span className="text-green-400 font-semibold"> carbon credit trading</span>.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full text-white font-semibold text-lg overflow-hidden hover:from-green-500 hover:to-emerald-500 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/30 hover:scale-105 animate-fade-in-up animation-delay-500">
                <span className="relative z-10">Start Trading</span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
              
              <button className="group px-8 py-4 border-2 border-green-500/50 rounded-full text-green-400 font-semibold text-lg hover:border-green-400 hover:bg-green-500/10 transition-all duration-300 hover:scale-105 animate-fade-in-up animation-delay-700">
                Learn More
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
              </button>
            </div>
          </div>
          
          <div className="relative group animate-fade-in-up animation-delay-200">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse-slow" />
            <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-2 border border-green-500/30 hover:border-green-400/50 transition-all duration-500">
              <img 
                src="/img.png" 
                alt="Green globe with trees and blockchain nodes" 
                className="rounded-2xl w-full h-auto group-hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-green-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-green-400 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-24 px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Platform Impact</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlowCard className="text-center" delay={100}>
              <AnimatedCounter target={1.2} suffix="M" />
              <p className="mt-4 text-gray-300 text-lg">Carbon Credits Minted</p>
              <div className="mt-4 w-full bg-gray-800 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full w-3/4 animate-pulse" />
              </div>
            </GlowCard>
            
            <GlowCard className="text-center" delay={300}>
              <AnimatedCounter target={450} suffix="+" />
              <p className="mt-4 text-gray-300 text-lg">Active Organizations</p>
              <div className="mt-4 w-full bg-gray-800 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full w-2/3 animate-pulse animation-delay-200" />
              </div>
            </GlowCard>
            
            <GlowCard className="text-center" delay={500}>
              <AnimatedCounter target={2.5} suffix="M" />
              <p className="mt-4 text-gray-300 text-lg">Trees Planted</p>
              <div className="mt-4 w-full bg-gray-800 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full w-5/6 animate-pulse animation-delay-400" />
              </div>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-6">How It Works</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Three simple steps to start making a positive environmental impact
            </p>
            <div className="w-32 h-1 bg-gradient-to-r from-green-400 to-emerald-400 mx-auto rounded-full mt-8" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: (
                  <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ),
                title: "Plant Trees",
                description: "Organizations plant trees and document their environmental impact with verified proof",
                step: "01"
              },
              {
                icon: (
                  <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Claim Credits",
                description: "Submit proofs and receive verified carbon credits through our blockchain system",
                step: "02"
              },
              {
                icon: (
                  <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                ),
                title: "Trade & Borrow",
                description: "Trade or lend carbon credits in our secure decentralized marketplace",
                step: "03"
              }
            ].map((item, index) => (
              <GlowCard key={index} className="text-center relative" delay={index * 200}>
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {item.step}
                </div>
                
                <div className="relative mx-auto bg-gradient-to-r from-green-500/20 to-emerald-500/20 w-24 h-24 rounded-full flex items-center justify-center mb-8 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all duration-500">
                  <div className="absolute inset-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-6">{item.title}</h3>
                <p className="text-gray-400 text-lg leading-relaxed">{item.description}</p>
                
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 w-12 h-0.5 bg-gradient-to-r from-green-500 to-transparent" />
                )}
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 bg-gradient-to-r from-green-900 via-emerald-900 to-green-900">
        <div className="absolute inset-0 bg-black/50" />
        <FloatingParticles />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-8">
            Ready to Make an <span className="text-green-400">Impact</span>?
          </h2>
          <p className="text-xl text-gray-200 mb-12 leading-relaxed max-w-3xl mx-auto">
            Join our growing network of environmentally conscious organizations and start your journey towards carbon neutrality.
          </p>
          
          <button className="group relative px-12 py-5 bg-white text-green-600 rounded-full font-bold text-xl overflow-hidden hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-white/20">
            <span className="relative z-10">Create Account</span>
            <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          
          <div className="mt-8 flex justify-center space-x-6 text-green-300">
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Free to Join
            </span>
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Instant Verification
            </span>
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Secure Trading
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                ZK Carbon
              </h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                Empowering a sustainable future through blockchain technology and verified environmental impact.
              </p>
              <div className="flex space-x-4">
                {[
                  { href: "https://twitter.com/zkcarbon", icon: "T" },
                  { href: "https://discord.gg/zkcarbon", icon: "D" },
                  { href: "#", icon: "L" }
                ].map((social, index) => (
                  <a key={index} href={social.href} 
                     className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold hover:scale-110 transition-transform duration-300 hover:shadow-lg hover:shadow-green-500/30">
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
            
            {[
              {
                title: "Marketplace",
                links: [
                  { href: "/browse", text: "Browse Credits" },
                  { href: "/create-claim", text: "Create a Claim" },
                  { href: "/verification", text: "Verification Process" }
                ]
              },
              {
                title: "Resources",
                links: [
                  { href: "/about", text: "About Us" },
                  { href: "/docs", text: "Documentation" },
                  { href: "/faq", text: "FAQ" }
                ]
              },
              {
                title: "Connect",
                links: [
                  { href: "/contact", text: "Contact Us" },
                  { href: "https://twitter.com/zkcarbon", text: "Twitter" },
                  { href: "https://discord.gg/zkcarbon", text: "Discord" }
                ]
              }
            ].map((section, index) => (
              <div key={index} className="space-y-6">
                <h4 className="text-xl font-bold text-white">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link href={link.href} 
                            className="text-gray-400 hover:text-green-400 transition-colors duration-300 text-lg hover:translate-x-1 inline-block transition-transform">
                        {link.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-lg">
              &copy; {new Date().getFullYear()} ZK Carbon. All rights reserved. 
              <span className="text-green-400 ml-2">Building a sustainable future.</span>
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-400 {
          animation-delay: 400ms;
        }
        
        .animation-delay-500 {
          animation-delay: 500ms;
        }
        
        .animation-delay-700 {
          animation-delay: 700ms;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}