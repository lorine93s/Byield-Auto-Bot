const { SuiClient, getFullnodeUrl } = require('@mysten/sui.js/client');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const { decodeSuiPrivateKey } = require('@mysten/sui.js/cryptography');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');
require('dotenv').config();

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  userInfo: (msg) => console.log(`${colors.white}[✓] ${msg}${colors.reset}`),
  balance: (msg) => console.log(`${colors.cyan}[💰] ${msg}${colors.reset}`),
  explorer: (msg) => console.log(`${colors.yellow}[🔗] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`  Byield Auto Bot - Airdrop Insiders  `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  }
};

const BYIELD_PACKAGE = "0x4995e309e990a6a93224153108b26bf79197b234c51db6447bbae10b431c42fb";
const VAULT_OBJECT = "0xf280477ca196a4bced5e1db4cd82fcdd647b55585b1d3838dcd8e1b829d263a4";
const INITIAL_SHARED_VERSION = "406061667";
const EXPLORER_BASE_URL = "https://suiscan.xyz/testnet";

class ByieldBot {
  constructor() {
    this.client = null;
    this.keys = [];
    this.proxies = [];
    this.currentProxyIndex = 0;
  }

  loadKeys() {
    const keys = [];
    let index = 1;

    while (true) {
      const privateKey = process.env[`PRIVATE_KEY_${index}`];
      const mnemonic = process.env[`MNEMONIC_${index}`];
      
      if (!privateKey && !mnemonic) {
        break; 
      }
      
      if (privateKey && privateKey.trim() !== '') {
        keys.push({ 
          type: 'privateKey', 
          value: privateKey.trim(),
          index: index 
        });
        logger.info(`Loaded Private Key ${index}`);
      }
      
      if (mnemonic && mnemonic.trim() !== '') {
        keys.push({ 
          type: 'mnemonic', 
          value: mnemonic.trim(),
          index: index 
        });
        logger.info(`Loaded Mnemonic ${index}`);
      }
      
      index++;
    }
    
    if (keys.length === 0) {
      logger.error("No private keys or mnemonics found in .env file!");
      logger.error("Please check your .env file format:");
      logger.error("PRIVATE_KEY_1=your_private_key_here");
      logger.error("MNEMONIC_1=your mnemonic phrase here");
      process.exit(1);
    }
    
    this.keys = keys;
    logger.success(`Total loaded: ${keys.length} keys`);
  }

  mnemonicToKeypair(mnemonic) {
    try {
      return Ed25519Keypair.deriveKeypair(mnemonic);
    } catch (error) {
      logger.error(`Error converting mnemonic to keypair: ${error.message}`);
      throw error;
    }
  }

  getKeypair(keyObj) {
    try {
      if (keyObj.type === 'privateKey') {
        return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(keyObj.value).secretKey);
      } else if (keyObj.type === 'mnemonic') {
        return this.mnemonicToKeypair(keyObj.value);
      }
      throw new Error(`Unknown key type: ${keyObj.type}`);
    } catch (error) {
      logger.error(`Error getting keypair for ${keyObj.type} ${keyObj.index}: ${error.message}`);
      throw error;
    }
  }

  loadProxies() {
    try {
      if (fs.existsSync('proxies.txt')) {
        const proxyData = fs.readFileSync('proxies.txt', 'utf8');
        this.proxies = proxyData.split('\n').filter(line => line.trim() !== '');
        if (this.proxies.length > 0) {
          logger.info(`Loaded ${this.proxies.length} proxies`);
        }
      } else {
        logger.warn("proxies.txt not found, running without proxy");
      }
    } catch (error) {
      logger.error(`Error loading proxies: ${error.message}`);
    }
  }

  createProxyAgent(proxyUrl) {
    try {
      if (proxyUrl.startsWith('http://')) {
        return new HttpProxyAgent(proxyUrl);
      } else if (proxyUrl.startsWith('https://')) {
        return new HttpsProxyAgent(proxyUrl);
      } else if (proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks5://')) {
        return new SocksProxyAgent(proxyUrl);
      } else {
        return new HttpProxyAgent(`http://${proxyUrl}`);
      }
    } catch (error) {
      logger.error(`Error creating proxy agent: ${error.message}`);
      return null;
    }
  }

  getNextProxy() {
    if (this.proxies.length === 0) return null;
    
    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  initializeClient() {
    const proxy = this.getNextProxy();
    const clientOptions = {};
    
    if (proxy) {
      const agent = this.createProxyAgent(proxy);
      if (agent) {
        clientOptions.httpAgent = agent;
        logger.info(`Using proxy: ${proxy}`);
      }
    }
    
    this.client = new SuiClient({
      url: getFullnodeUrl('testnet'),
      ...clientOptions
    });
  }

  async getAndDisplayBalance(address, accountIndex, keyType) {
    try {
      const balance = await this.client.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI'
      });
      
      const balanceInSui = parseInt(balance.totalBalance) / 1e9;
      logger.balance(`Account ${accountIndex + 1} (${keyType}) Balance: ${balanceInSui.toFixed(4)} SUI`);
      logger.explorer(`Explorer: ${EXPLORER_BASE_URL}/address/${address}`);
      
      return balanceInSui;
    } catch (error) {
      logger.error(`Error getting balance for account ${accountIndex + 1}: ${error.message}`);
      return 0;
    }
  }

  async displayAllBalances() {
    logger.step("Checking all account balances...");
    console.log();
    
    for (let i = 0; i < this.keys.length; i++) {
      try {
        const keypair = this.getKeypair(this.keys[i]);
        const address = keypair.getPublicKey().toSuiAddress();
        await this.getAndDisplayBalance(address, i, this.keys[i].type);
      } catch (error) {
        logger.error(`Error checking balance for account ${i + 1}: ${error.message}`);
      }
    }
    
    console.log();
  }

  suiToMist(suiAmount) {
    return Math.floor(suiAmount * 1e9);
  }

  async createSwapTransaction(keypair, suiAmount) {
    const tx = new TransactionBlock();
    const amountInMist = this.suiToMist(suiAmount);

    const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountInMist)]);

    tx.moveCall({
      target: `${BYIELD_PACKAGE}::nbtc_swap::swap_sui_for_nbtc`,
      arguments: [
        tx.object(VAULT_OBJECT),
        coin
      ]
    });
    
    return tx;
  }

  async executeSwap(keyObj, suiAmount, accountIndex) {
    try {
      const keypair = this.getKeypair(keyObj);
      const address = keypair.getPublicKey().toSuiAddress();
      
      logger.loading(`Account ${accountIndex + 1} (${keyObj.type}) (${address.slice(0, 8)}...): Creating swap transaction`);

      const balanceInSui = await this.getAndDisplayBalance(address, accountIndex, keyObj.type);
      
      if (balanceInSui < suiAmount) {
        logger.error(`Account ${accountIndex + 1}: Insufficient balance. Available: ${balanceInSui.toFixed(4)} SUI, Required: ${suiAmount} SUI`);
        return false;
      }

      const tx = await this.createSwapTransaction(keypair, suiAmount);
      
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showBalanceChanges: true
        }
      });
      
      if (result.effects?.status?.status === 'success') {
        const nbtcChange = result.balanceChanges?.find(change => 
          change.coinType.includes('nbtc::NBTC') && parseInt(change.amount) > 0
        );
        
        const nbtcReceived = nbtcChange ? (parseInt(nbtcChange.amount) / 1e8).toFixed(8) : '0';
        
        logger.success(`Account ${accountIndex + 1}: Swap successful! TX: ${result.digest}`);
        logger.success(`Account ${accountIndex + 1}: Received ${nbtcReceived} nBTC`);
        logger.explorer(`Transaction: ${EXPLORER_BASE_URL}/tx/${result.digest}`);
        return true;
      } else {
        logger.error(`Account ${accountIndex + 1}: Transaction failed`);
        return false;
      }
      
    } catch (error) {
      logger.error(`Account ${accountIndex + 1}: Error executing swap - ${error.message}`);
      return false;
    }
  }

  async run() {
    logger.banner();

    this.loadKeys();
    this.loadProxies();

    this.initializeClient();

    await this.displayAllBalances();

    const suiAmount = parseFloat(readlineSync.question('Enter SUI amount per transaction: '));
    const transactionCount = parseInt(readlineSync.question('Enter number of transactions per account: '));

    const delayBetweenTx = 10000;
    
    if (isNaN(suiAmount) || isNaN(transactionCount) || suiAmount <= 0 || transactionCount <= 0) {
      logger.error("Invalid input values!");
      return;
    }
    
    console.log();
    logger.info("Starting transactions...");
    console.log();

    for (let accountIndex = 0; accountIndex < this.keys.length; accountIndex++) {
      logger.step(`Processing Account ${accountIndex + 1}/${this.keys.length} (${this.keys[accountIndex].type})`);

      this.initializeClient();
      
      let successCount = 0;
      
      for (let txIndex = 0; txIndex < transactionCount; txIndex++) {
        logger.loading(`Account ${accountIndex + 1}: Transaction ${txIndex + 1}/${transactionCount}`);
        
        const success = await this.executeSwap(
          this.keys[accountIndex], 
          suiAmount, 
          accountIndex
        );
        
        if (success) {
          successCount++;
        }

        if (txIndex < transactionCount - 1) {
          logger.info(`Waiting 10 seconds before next transaction...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenTx));
        }
      }
      
      logger.success(`Account ${accountIndex + 1} completed: ${successCount}/${transactionCount} successful transactions`);
      console.log();

      if (accountIndex < this.keys.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    logger.success("All transactions completed!");
    logger.explorer(`View all transactions on: ${EXPLORER_BASE_URL}`);
  }
}

async function main() {
  const bot = new ByieldBot();
  await bot.run();
}

main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
