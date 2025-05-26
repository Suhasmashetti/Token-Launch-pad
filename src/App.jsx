import { TokenLaunchpad } from './components/TokenLaunchpad';

// wallet adapter imports
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

// Wallets to include
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    
} from '@solana/wallet-adapter-wallets';

import { useMemo } from 'react';
import { clusterApiUrl } from '@solana/web3.js';

function App() {
    // Set up wallets with useMemo to prevent unnecessary re-renders
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network: 'devnet' }),
            new TorusWalletAdapter(),
        ],
        []
    );

    const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

    return (
        <div style={{ width: '100vw' }}>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>

                        <TokenLaunchpad />
                        
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </div>
    );
}

export default App;
