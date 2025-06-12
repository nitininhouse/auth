// import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
// import CarbonCreditMarketplaceABI from '../utils/CarbonCreditMarketplace.json'
// const CONTRACT_ADDRESS = "0x579Af937f3ce12B4E76bAea112EFa09D4f345f75";
// const CONTRACT_ABI = [
//   {
//     "inputs": [
//       { "internalType": "string", "name": "_name", "type": "string" },
//       { "internalType": "string", "name": "_description", "type": "string" },
//       { "internalType": "string", "name": "_profilePhotoipfsHashCode", "type": "string" },
//       { "internalType": "address", "name": "_walletAddress", "type": "address" },
//       { "internalType": "uint256", "name": "_timesBorrowed", "type": "uint256" },
//       { "internalType": "uint256", "name": "_timesLent", "type": "uint256" },
//       { "internalType": "uint256", "name": "_totalCarbonCreditsLent", "type": "uint256" },
//       { "internalType": "uint256", "name": "_totalCarbonCreditsBorrowed", "type": "uint256" },
//       { "internalType": "uint256", "name": "_totalCarbonCreditsReturned", "type": "uint256" },
//       { "internalType": "uint256", "name": "_emissions", "type": "uint256" },
//       { "internalType": "uint256", "name": "_reputationScore", "type": "uint256" }
//     ],
//     "name": "createOrganisation",
//     "outputs": [],
//     "stateMutability": "nonpayable",
//     "type": "function"
//   },
//   {
//     "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
//     "name": "addressToOrganisation",
//     "outputs": [
//       { "internalType": "string", "name": "name", "type": "string" },
//       { "internalType": "string", "name": "description", "type": "string" },
//       { "internalType": "string", "name": "profilePhotoipfsHashCode", "type": "string" },
//       { "internalType": "address", "name": "walletAddress", "type": "address" },
//       { "internalType": "uint256", "name": "timesBorrowed", "type": "uint256" },
//       { "internalType": "uint256", "name": "timesLent", "type": "uint256" },
//       { "internalType": "uint256", "name": "totalCarbonCreditsLent", "type": "uint256" },
//       { "internalType": "uint256", "name": "totalCarbonCreditsBorrowed", "type": "uint256" },
//       { "internalType": "uint256", "name": "totalCarbonCreditsReturned", "type": "uint256" },
//       { "internalType": "uint256", "name": "emissions", "type": "uint256" },
//       { "internalType": "uint256", "name": "reputationScore", "type": "uint256" }
//     ],
//     "stateMutability": "view",
//     "type": "function"
//   },
//   {
//     "type": "function",
//     "name": "recordOrganisationEmissions",
//     "inputs": [
//       {
//         "name": "_emissions",
//         "type": "uint256",
//         "internalType": "uint256"
//       }
//     ],
//     "outputs": [],
//     "stateMutability": "nonpayable"
//   }
// ];

// export interface Organisation {
//   name: string;
//   description: string;
//   profilePhotoipfsHashCode: string;
//   walletAddress: string;
//   reputationScore: string;
//   carbonCredits: string;
//   profilePhoto: string;
//   emissions?: string;
// }

// export const OrganisationService = {
//   async checkRegistration(provider: BrowserProvider, address: string): Promise<Organisation | null> {
//     try {
//       const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
//       const org = await contract.addressToOrganisation(address);
      
//       if (org.name !== "") {
//         return {
//           name: org.name,
//           description: org.description,
//           walletAddress: address,
//           reputationScore: org.reputationScore.toString(),
//           carbonCredits: "0",
//           profilePhoto: org.profilePhotoipfsHashCode,
//           emissions: org.emissions?.toString()
//         };
//       }
//       return null;
//     } catch (err) {
//       console.error("Error checking registration:", err);
//       throw err;
//     }
//   },

//   async getMyOrganisationDetails(provider: BrowserProvider): Promise<Organisation | null> {
//     try {
//       const contract = new Contract(CONTRACT_ADDRESS, CarbonCreditMarketplaceABI.abi, provider);
//       const org = await contract.getMyOrganisationDetails();
//       return org;
//     }
//     catch (err) {
//       console.error("Error checking registration:", err);
//       throw err;
//     }
//   },

//   async registerOrganisation(
//     signer: JsonRpcSigner,
//     account: string,
//     name: string,
//     description: string,
//     profilePhoto: File | null
//   ): Promise<Organisation> {
//     try {
//       const ipfsHash = profilePhoto
//         ? await this.uploadToIPFS(profilePhoto)
//         : "default_hash";

//       const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
//       const tx = await contract.createOrganisation(
//         name,
//         description,
//         ipfsHash,
//         account,
//         0, 0, 0, 0, 0, 0, 0
//       );
//       await tx.wait();

//       return {
//         name,
//         description,
//         walletAddress: account,
//         reputationScore: "0",
//         carbonCredits: "0",
//         profilePhoto: ipfsHash
//       };
//     } catch (err) {
//       console.error("Registration failed:", err);
//       throw err;
//     }
//   },

//   async recordEmissions(
//     signer: JsonRpcSigner,
//     emissions: number
//   ): Promise<void> {
//     if (!signer) throw new Error("Wallet not connected");
//     if (isNaN(emissions) || emissions <= 0) throw new Error("Invalid emissions value");

//     try {
//       const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
//       const tx = await contract.recordOrganisationEmissions(emissions);
//       await tx.wait();
//     } catch (err) {
//       console.error("Failed to record emissions:", err);
//       throw err;
//     }
//   },

//   async uploadToIPFS(file: File): Promise<string> {
//     // This is a mock implementation - replace with actual IPFS upload logic
//     return new Promise((res) => {
//       setTimeout(() => {
//         res("QmMockHash12345");
//       }, 1000);
//     });
//   }
// };