// useEffect hook
import { useEffect, useState } from 'react';

import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';


import twitterLogo from './assets/twitter-logo.svg';
import './App.css';

import idl from './idl.json';
import kp from './keypair.json';

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair} = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done". This preflightCommitment: "processed" thing is interesting. You can read on it a little here. Basically, we can actually choose when to receive a confirmation for when our transaction has succeeded. Because the blockchain is fully decentralized, we can choose how long we want to wait for a transaction. Do we want to wait for just one node to acknowledge our transaction? Do we want to wait for the whole Solana chain to acknowledge our transaction?
// In this case, we simply wait for our transaction to be confirmed by the node we're connected to. This is generally okay — but if you wanna be super super sure you may use something like "finalized" instead. For now, let's roll with "processed".
const opts = {
  preflightCommitment: "processed"
}


// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const TEST_GIFS = [
	'https://i.giphy.com/media/eIG0HfouRQJQr1wBzz/giphy.webp',
	'https://media3.giphy.com/media/L71a8LW2UrKwPaWNYM/giphy.gif?cid=ecf05e47rr9qizx2msjucl1xyvuu47d7kf25tqt2lvo024uo&rid=giphy.gif&ct=g',
	'https://media4.giphy.com/media/AeFmQjHMtEySooOc8K/giphy.gif?cid=ecf05e47qdzhdma2y3ugn32lkgi972z9mpfzocjj6z1ro4ec&rid=giphy.gif&ct=g',
	'https://i.giphy.com/media/PAqjdPkJLDsmBRSYUp/giphy.webp'
]


const App = () => {

  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);


  // Actions

  // Phantom wallet is connected or not 
  /*
  Our function here is checking the window object in our DOM to see if the 
  Phantom Wallet extension has injected the solana object. 
  If we do have a solana object, we can also check to see if it's a Phantom Wallet.
  */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhanthom) {
          console.log('Phantom wallet found!');

          // The solana object gives us a function that will allow us to connect directly with the user's wallet!
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log('Connected with Public Key:', response.publicKey.toString());

          // Set the users's public key in state to be used later
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a phantom Wallet');
      }
    } catch (error) {
      console.log(error)
    }
  };


  // connect logic
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };


  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  // solana connection
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }



  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No gif link given!');
      return
    } 
    console.log('Gif link:', inputValue);
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue)

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error);
    }
  };


  // We want to render this UI when the user hasn't connected their wallet to our app yet.
  const renderNotConnectedContainer = () => (
    <button className="cta-button connect-wallet-button" onClick={connectWallet}>
      Connect to Wallet
    </button>
  );

  // render this if wallet is connected 
  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    // Otherwise, we're good! Account exists. User can submit GIFs.
    } else {
      return (
        <div className="connected-container">
          <form onSubmit={(event) => {event.preventDefault(); sendGif();}}>
            <input type="text" placeholder="Enter gif link!" value={inputValue} onChange={onInputChange}/>
            <button type="submit" className="cta-button submit-gif-button">Submit</button>
          </form>
          <div className="gif-grid">
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} alt={item.gifLink} ></img>
              </div>
            ))} 
          </div>
        </div>
      )
    } 
  };
    



  //  When our component first mounts, let's check to see if we have a connected Phantom Wallet
  /**
   * In React, the useEffect hook gets called once on component mount when 
   * that second parameter  is empty! So, this is perfect for us. 
   * As soon as someone goes to our app, we can check to see if they have 
   * Phantom Wallet installed or not. This will be very important soon. 
   * Currently, the Phantom Wallet team suggests to wait for the window to fully finish loading before checking for the solana object. Once this event gets called, we can guarantee that this object is available if the user has the Phantom Wallet extension installed.
   */
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);



  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setGifList(account.gifList)
  
    } catch (error) {
      console.log("Error in getGifList: ", error)
      setGifList(null);
    }
  }
  

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList()
    }
  }, [walletAddress]);


  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString());
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error);
    }
  }
  










  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 Lilhouse GIF Portal</p>
          <p className="sub-text">
            View the Lilhouse GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
