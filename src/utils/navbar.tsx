import ConnectWallet from '@/components/ConnectWallet';
import Head from 'next/head';
import Link from 'next/link';
import CivicConnectWallet from '@/components/CivicConnectWallet'; // Updated import

const Navbar = () => {
    return (
        <nav className="bg-white border-b border-gray-100 py-4 px-6 md:px-12">
                <div className="flex justify-between items-center">
                <Link href="/">
                    <span className="text-2xl font-bold text-green-600 cursor-pointer">ZK Carbon</span>
                </Link>
                <div className="flex items-center space-x-8">
                    <Link href="/Claim" className="text-gray-600 hover:text-green-600">Claims</Link>
                    <Link href="/organisations" className="text-gray-600 hover:text-green-600">Organizations</Link>
                    <Link href="/addClaim" className="text-gray-600 hover:text-green-600">Create Claim</Link>
                    
                    <Link href="/request" className="text-gray-600 hover:text-green-600"> Request</Link>
                    <Link href="/profile" className="text-gray-600 hover:text-green-600">Profile</Link>

                    <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <CivicConnectWallet />
                    </div>
                </div>
            </div>
        </nav>
    );
};
export default Navbar;


