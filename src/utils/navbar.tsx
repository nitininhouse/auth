import ConnectWallet from '@/components/ConnectWallet';
import Head from 'next/head';
import Link from 'next/link';
import CivicConnectWallet from '@/components/CivicConnectWallet';

const Navbar = () => {
  return (
    <nav className="relative bg-black border-b border-green-500/30 py-6 px-6 md:px-12">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-black to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent" />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), 
                           linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }} />
      </div>

      <div className="relative z-10 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="group">
          <span className="text-3xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform duration-300">
            ZK Carbon
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-8">
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/Claim" 
              className="group relative text-gray-300 hover:text-green-400 font-medium transition-all duration-300 hover:scale-105"
            >
              Claims
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            
            <Link 
              href="/organisations" 
              className="group relative text-gray-300 hover:text-green-400 font-medium transition-all duration-300 hover:scale-105"
            >
              Organizations
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            
            <Link 
              href="/addClaim" 
              className="group relative text-gray-300 hover:text-green-400 font-medium transition-all duration-300 hover:scale-105"
            >
              Create Claim
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            
            <Link 
              href="/request" 
              className="group relative text-gray-300 hover:text-green-400 font-medium transition-all duration-300 hover:scale-105"
            >
              Request
              <span className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            
            <Link 
              href="/profile" 
              className="group relative text-gray-300 hover:text-green-400 font-medium transition-all duration-300 hover:scale-105"
            >
              Profile
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </div>

          {/* Status and Wallet */}
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 h-3 w-3 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <span className="text-xs text-green-400 font-medium hidden sm:block">LIVE</span>
            </div>
            
            {/* Wallet Component */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative">
                <CivicConnectWallet />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;