import { useState } from 'react';
import './App.css';
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import gen from './Gen.json';
import walletSnapshot from './walletSnapshot.json'
import WalletConnectProvider from "@walletconnect/web3-provider";
import {CoinbaseWalletSDK} from "@coinbase/wallet-sdk";

// import { Buffer } from "buffer/";
// window.Buffer = window.Buffer || Buffer;

const providerOptions = {

  walletconnect: {
    package: WalletConnectProvider, // required
    options: {
      infuraId: "8231230ce0b44ec29c8682c1e47319f9" // required
    }
  },
  coinbasewallet: {
    package: CoinbaseWalletSDK, // required
    options: {
      infuraId: "8231230ce0b44ec29c8682c1e47319f9" // required
    }
  }
  
};


const {MerkleTree} =  require('merkletreejs');
const keccak256 = require('keccak256');

const allowlist = require ('./allowlist');


const arcAddress = '0x4B396F08cDa12A9F6C0cD9cBab6bDfa06585077B';
const genAddress = '0x10438338ebafb9Ca82136435E31eFC82A5c975cD';


const allowList = allowlist.allowListAddresses();

let leafNodes = allowList.map(addr => keccak256(addr));

let merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});

function App() {
  const [web3Provider, setWeb3Provider] = useState(null)

  const [accounts, setAccounts] = useState ([]);
  const [isConfirming, setConfirming] = useState (Boolean(0));
  const [isSent, setSent] = useState (Boolean(0));
  const [isMinted, setMinted] = useState(Boolean(0));
  const [mintAmount, setMintAmount] = useState (1);
  const [txnHash, setTxnHash] = useState('');
  const [txnURL, setTxnURL] = useState('');
  const [totalSupply, updateTotalSupply] = useState ([]);
  const [isTotalSupply, setTotalSupply] = useState (Boolean(totalSupply[0]));
  const [globalArcTokens,setArcTokens] = useState([]);
  const [globalGenTokens,setGenTokens] = useState([]);
  const [globalNotMinted,setNotMinted] = useState(null);

  const connectAccount = async () => { 
    try {
      const web3Modal = new Web3Modal({
        cacheProvider: false, // optional
        providerOptions // required
      });
      const instance = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(instance);
      console.log(provider)
      const signer = provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      setAccounts(address)
      console.log(address)
      if(provider) {
        setWeb3Provider(provider)
      }

      let arcTokensOwned = []
      let genTokensOwned = []

      arcTokensOwned.push(walletSnapshot[0][address])

          const genURL = 'https://api.etherscan.io/api?module=account&action=tokennfttx&contractaddress='+genAddress+'&address='+address+'&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=S3KASSMNT3ARZHEUU2NM9G3IMXH98BB8W7'
        await fetch(genURL)
          .then((response) => { return response.json();})
          .then((data) => {
            for(let i = 0; i < data.result.length; i++) {
              const owner = data.result[i]['to'];
              if (owner === address) {
                genTokensOwned.push(data.result[i]['tokenID']);
              } else {
                console.log("err");
              };
              
            }
          });
        let genTokensNotMinted = arcTokensOwned[0] - genTokensOwned.length;
        
        setArcTokens(arcTokensOwned)
        setGenTokens(genTokensOwned)
        setNotMinted(genTokensNotMinted)

    } catch (error) {
      console.error(error)
    }
  }



  const handleDecrement = () => {
    if (mintAmount <= 1 ) return;
    setMintAmount(mintAmount - 1);
  };

  const handleIncrement = () => {
    if (mintAmount >= globalNotMinted ) return;
    setMintAmount(mintAmount + 1);
  };
  
  
  async function getTotalSupply() {

    const provider = web3Provider;
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
        genAddress,
        gen.output.abi,
        signer
    );
    console.log(contract)
 //   console.log(gen.output.abi)
    try {
        console.log("test")
        const response = await contract.totalSupply();
        console.log(response)
        const hex = response['_hex']
        const maxSupply =  parseInt(hex,16)
        console.log(maxSupply)
        updateTotalSupply(maxSupply)
        setTotalSupply(Boolean(1))
    } 
    catch (err) {
        console.log('error', err )
    }

}

  async function handleGenMint() {
    setConfirming(Boolean(1));
    setSent(Boolean(0));
    if (web3Provider) {
      const provider = web3Provider;
      const signer = provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
            console.log(address)
      let index = null
      if (allowList.includes(address)) {
        index = allowList.indexOf(address)
      } else {
        index = -1
      }
      console.log(index)
      
      const genContract = new ethers.Contract(
        genAddress,
        gen.output.abi,
        signer
      );
      if (index === -1) {
        alert('You must be allowlisted to mint these Gen-0 Characters');
        return;
    } else {
      try {
        if (globalNotMinted === 0) {
          setConfirming(Boolean(0));
          return;
        } else {
          if (mintAmount > globalNotMinted) {
            return;
          } else {
            let clamingAddress = leafNodes[index];
            let hexProof = merkleTree.getHexProof(clamingAddress);
            
            const response = await genContract.arcListMint(ethers.BigNumber.from(mintAmount), hexProof)
            let transactionHash = response['hash']
            setConfirming(Boolean(0));
            setSent(Boolean(1))
            const txReceipt = []
            do {
            let txr = await provider.getTransactionReceipt(transactionHash)
            txReceipt[0]=txr
            console.log('test')
            } while (txReceipt[0] == null) ;
            
            console.log(txReceipt[0])
            setTxnHash(transactionHash)
            setTxnURL('https://etherscan.io/tx/'+transactionHash)
            setMinted(Boolean(1))
            setNotMinted(globalNotMinted-mintAmount)


          }
        }
      } 
      catch (err) {
        setConfirming(Boolean(0))
        console.log('error', err )
      }
    }
  }
}

  return (
    
    <div className="App">
      <div className="container">
        <div className="heightBox">
        <div className='feed'>
        <div>
          {web3Provider == null ? (
            <p className='paragraphs'>Please connect your wallet to mint</p>
          ) : (
            <p className='inactive'>Please connect your wallet to mint</p>
          )
          }
        </div>

        <p className="paragraph">
          {(web3Provider != null) && (<span>Connected.</span>) }
          {(web3Provider != null && globalArcTokens[0]===0) && (<span> You must hold Arcturium to mint. Public mint opens 2:00 pm EST 24/09/2022</span>)}
          { (web3Provider != null && globalNotMinted>0) && (<span>You have {globalNotMinted} Gen-0 available to mint.</span>)}
          
          </p>
        
        {isTotalSupply && <div> <p className='paragraph'> {totalSupply} of 6000 Gen-0 Characters have been minted.</p></div>}

        
          {(isConfirming && Boolean(globalArcTokens[0]) ) && <p className='paragraph'>Awaiting confirmation in wallet...</p>} 

          {isSent && <span><p className='inactive'>Awaiting confirmation in wallet...</p><br></br><p className='paragraph'> Transaction sent...</p></span>}
          {isMinted && <span><p className='inactive'>Awaiting confirmation in wallet...</p>
          <br></br>
          <p className='inactive'> Transaction sent...</p>
          <br></br>
          <p className='paragraph'>Minted. <a className='button' href={txnURL}>View your transaction. </a></p></span>}
        

        {(isConfirming && !Boolean([globalArcTokens[0]])) && <p className='paragraph'>Mint cancelled. You must hold Arcturium to mint. Public mint opens 2:00 pm EST 24/09/2022</p>}
        {(web3Provider !== null && globalNotMinted === 0 && globalArcTokens[0] !== 0) && <p className='paragraph'>You have minted all available Gen-0. Public mint opens 2:00 pm EST 24/09/2022 </p>}
        



        <span className="rectangleblink">&#9646;</span>
        { web3Provider == null && (
              <p className="button" onClick={connectAccount}><span className="check">>></span>| Connect</p>
          )}
        </div>
        <div>
          {(web3Provider != null && globalNotMinted > 0) &&  ( 
            <div className="mintControls">
              <div>
                <p><span className='button'
                    onClick={handleDecrement}><i className="downArrow"></i>
                    </span>
                <input 
                  readOnly
                  type='number' 
                  value={mintAmount}/>
                <span className='button'
                  onClick={handleIncrement}><i className="upArrow"></i>
                  </span>
                </p>
              </div>
              <p className='mintButtons'>
                <span className='button' 
                onClick={handleGenMint}><span className="check">>></span>| Mint Now
              </span> <br></br>
              <span className='button' 
                onClick={getTotalSupply}><span className="check">>></span>| #Minted?
                </span>
              </p>
            </div>
          ) }
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;
