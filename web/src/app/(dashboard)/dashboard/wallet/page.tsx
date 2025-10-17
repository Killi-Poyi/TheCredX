// app/dashboard/wallet/page.tsx
"use client";

import { useAuth } from "@/app/context/auth";
import React, { useState, useEffect } from "react";

// Based on your `prisma/schema.prisma` for the 'transactions' model
interface Transaction {
  transaction_id: number;
  created_at: string;
  transaction_type: 'impression_fee' | 'platform_fee' | 'viewer_bonus' | 'host_pay';
  amount: string; // Prisma Decimal is serialized as a string
  content_id: string | null;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
}

// Type for the data structure coming from your API
interface WalletApiResponse {
  balance: string; // Prisma Decimal is serialized as a string
  transactions: Transaction[];
}

// Type for the data structure used in the component's state
interface WalletState {
    balance: number;
    transactions: Transaction[];
}

// This is the main page component for the /dashboard/wallet route.
export default function WalletPage() {
  const { user, session, loading: isAuthLoading } = useAuth();

  // State to hold the wallet data, converted for display
  const [walletData, setWalletData] = useState<WalletState>({
    balance: 0,
    transactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/wallet');

        if (!response.ok) {
          throw new Error('Failed to fetch wallet data.');
        }

        const data: WalletApiResponse = await response.json();
        
        // Convert API data to the format needed for the state
        setWalletData({
            balance: parseFloat(data.balance),
            transactions: data.transactions
        });
        setError(null);

      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [session]);

  // Helper function to generate a human-readable description
  const getTransactionDescription = (transaction: Transaction): string => {
    switch (transaction.transaction_type) {
        case 'impression_fee':
            return `Fee for content impression`;
        case 'platform_fee':
            return `CredX platform fee`;
        case 'viewer_bonus':
            return `Bonus earned for viewing content`;
        case 'host_pay':
            return `Payment received for hosting content`;
        default:
            // This will help you catch any unhandled transaction types
            return `Transaction: ${transaction.transaction_type}`;
    }
  };


  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <p>Please log in to view your wallet.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-black p-8 text-white">
      <div>
        <h1 className="text-3xl font-bold text-white">My Wallet</h1>
        <p className="mt-2 text-gray-400">
          Track your earnings and spending.
        </p>

        {/* Balance Display Card */}
        <div className="mt-8 w-full max-w-md rounded-lg bg-black p-6 shadow-lg border border-gray-700">
          <h2 className="text-sm font-medium text-gray-400">Current Balance</h2>
          {loading ? (
            <p className="mt-1 text-4xl font-semibold text-gray-500">...</p>
          ) : error ? (
            <p className="mt-1 text-lg font-semibold text-red-500">{error}</p>
          ) : (
            <p className="mt-1 text-4xl font-semibold text-white">
              <span className="text-green-400">{walletData.balance.toFixed(2)}</span> Credits
            </p>
          )}
        </div>

        {/* Transaction History Table */}
        <div className="mt-8 flex flex-col">
          <h2 className="text-xl font-semibold text-white">Transaction History</h2>
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-lg shadow-md border border-gray-700">
                {loading ? (
                  <div className="p-4 text-center text-gray-400">Loading transactions...</div>
                ) : error ? (
                  <div className="p-4 text-center text-red-500">{error}</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-950">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-black">
                      {walletData.transactions && walletData.transactions.map((transaction) => {
                        const amount = parseFloat(transaction.amount);
                        const isCredit = amount > 0;
                        
                        return (
                            <tr key={transaction.transaction_id}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">{new Date(transaction.created_at).toLocaleDateString()}</td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <span className={`rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                                    isCredit ? "bg-green-900/50 text-green-300" : "bg-red-900/50 text-red-300"
                                }`}
                                >
                                {transaction.transaction_type.replace('_', ' ').toUpperCase()}
                                </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-white">
                                {getTransactionDescription(transaction)}
                            </td>
                            <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                                isCredit ? "text-green-400" : "text-red-400"
                            }`}
                            >
                                {isCredit ? `+${amount.toFixed(2)}` : amount.toFixed(2)}
                            </td>
                            </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

