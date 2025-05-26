import React, { useState } from 'react';
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    MINT_SIZE, TOKEN_2022_PROGRAM_ID, createMintToInstruction,
    createAssociatedTokenAccountInstruction, getMintLen,
    createInitializeMetadataPointerInstruction, createInitializeMintInstruction,
    TYPE_SIZE, LENGTH_SIZE, ExtensionType,
    getAssociatedTokenAddressSync
} from "@solana/spl-token";
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import { Rocket, Coins, Link, Hash, Layers } from 'lucide-react';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [uri, setUri] = useState('');
    const [supply, setSupply] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function createToken() {
        if (!wallet.publicKey) return alert("Connect wallet first.");
        if (!name || !symbol || !uri || !supply || isNaN(supply)) {
            return alert("Please fill all fields correctly.");
        }

        try {
            setLoading(true);
            setMessage('');

            const mintKeypair = Keypair.generate();

            const metadata = {
                mint: mintKeypair.publicKey,
                name,
                symbol: symbol.padEnd(8, ' '),
                uri,
                additionalMetadata: [],
            };

            const mintLen = getMintLen([ExtensionType.MetadataPointer]);
            const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
            const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

            const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: mintKeypair.publicKey,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(
                    mintKeypair.publicKey,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeMintInstruction(
                    mintKeypair.publicKey,
                    9,
                    wallet.publicKey,
                    null,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeInstruction({
                    programId: TOKEN_2022_PROGRAM_ID,
                    mint: mintKeypair.publicKey,
                    metadata: mintKeypair.publicKey,
                    name: metadata.name,
                    symbol: metadata.symbol,
                    uri: metadata.uri,
                    mintAuthority: wallet.publicKey,
                    updateAuthority: wallet.publicKey,
                })
            );

            transaction.feePayer = wallet.publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            transaction.partialSign(mintKeypair);

            await wallet.sendTransaction(transaction, connection);

            const associatedToken = getAssociatedTokenAddressSync(
                mintKeypair.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            );

            const transaction2 = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    mintKeypair.publicKey,
                    TOKEN_2022_PROGRAM_ID
                )
            );
            await wallet.sendTransaction(transaction2, connection);

            const transaction3 = new Transaction().add(
                createMintToInstruction(
                    mintKeypair.publicKey,
                    associatedToken,
                    wallet.publicKey,
                    parseInt(supply),
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            );
            await wallet.sendTransaction(transaction3, connection);

            setMessage(`✅ Token created at ${mintKeypair.publicKey.toBase58()}`);
        } catch (err) {
            console.error(err);
            setMessage("❌ Error creating token. See console for details.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
                        <Rocket className="w-8 h-8 text-black" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Token Launchpad</h1>
                    <p className="text-gray-400 text-sm">Create your own Solana SPL token</p>
                </div>

                <div className="bg-neutral-900 rounded-2xl p-8 shadow-xl border border-white/10 flex flex-col gap-4 text-center">
                    <div>
                        <WalletMultiButton />
                    </div>
                    <div className="space-y-6">
                        {[
                            { value: name, set: setName, icon: <Coins />, placeholder: "Token Name" },
                            { value: symbol, set: setSymbol, icon: <Hash />, placeholder: "Symbol (max 8 chars)", maxLength: 8 },
                            { value: uri, set: setUri, icon: <Link />, placeholder: "Metadata URI" },
                            { value: supply, set: setSupply, icon: <Layers />, placeholder: "Initial Supply", type: "number" },
                        ].map((field, idx) => (
                            <div key={idx} className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <div className="text-gray-400">{field.icon}</div>
                                </div>
                                <input
                                    type={field.type || "text"}
                                    placeholder={field.placeholder}
                                    maxLength={field.maxLength}
                                    className="w-full pl-10 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                                    value={field.value}
                                    onChange={(e) => field.set(e.target.value)}
                                />
                            </div>
                        ))}

                        <button
                            onClick={createToken}
                            disabled={loading}
                            className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                                loading
                                    ? 'bg-neutral-700 cursor-not-allowed'
                                    : 'bg-white text-black hover:bg-gray-200'
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Creating Token...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center space-x-2">
                                    <Rocket className="w-5 h-5" />
                                    <span>Launch Token</span>
                                </div>
                            )}
                        </button>

                        {message && (
                            <div className={`p-4 mt-2 rounded-lg border text-sm font-medium break-words ${
                                message.startsWith("✅")
                                    ? "bg-green-800/10 border-green-500 text-green-300"
                                    : "bg-red-800/10 border-red-500 text-red-300"
                            }`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center mt-6 text-gray-500 text-xs">
                    Powered by Solana • Built with Token-2022 Program
                </div>
            </div>
        </div>
    );
}
