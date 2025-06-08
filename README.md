# Byield Auto Bot

Automated trading bot for Byield protocol on Sui testnet that performs SUI to nBTC swaps.

## Features

- **Multi-Account Support**: Manage multiple wallets simultaneously
- **Flexible Authentication**: Support for both private keys and mnemonic phrases
- **Proxy Support**: HTTP, HTTPS, and SOCKS proxy support for enhanced privacy
- **Balance Tracking**: Real-time balance monitoring for all accounts
- **Batch Transactions**: Execute multiple swaps per account

## Requirements

- Node.js 16.x or higher
- npm or yarn
- SUI testnet tokens
- Valid private keys or mnemonic phrases

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vikitoshi/Byield-Auto-Bot.git
   cd Byield-Auto-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory with your wallet credentials:

```env
# Private Keys (if using private keys)
PRIVATE_KEY_1=your_private_key_here
PRIVATE_KEY_2=your_second_private_key_here

# Mnemonics (if using mnemonic phrases)
MNEMONIC_1=your twelve word mnemonic phrase here
MNEMONIC_2=your second twelve word mnemonic phrase here
```

**Note**: You can use either private keys or mnemonics, or mix both. The bot will automatically detect and load all available credentials.

### Proxy Configuration (Optional)

Create a `proxies.txt` file in the root directory with one proxy per line:

```
http://username:password@proxy1.com:8080
https://username:password@proxy2.com:8080
socks5://username:password@proxy3.com:1080
```

Supported proxy formats:
- `http://proxy:port`
- `https://proxy:port`
- `socks4://proxy:port`
- `socks5://proxy:port`
- `http://username:password@proxy:port`

## Usage

1. **Run the bot**
   ```bash
   node index.js
   ```

2. **Follow the prompts**
   - Enter the SUI amount per transaction
   - Enter the number of transactions per account
   - The bot will execute transactions automatically

## Project Structure

```
Byield-Auto-Bot/
├── index.js           # Main bot script
├── package.json       # Dependencies and scripts
├── .env              # Environment variables (create this)
├── .env.example      # Environment template
├── proxies.txt       # Proxy list (optional)
└── README.md         # This file
```

## Safety Features

- **Balance Validation**: Ensures sufficient funds before transactions
- **Error Handling**: Comprehensive error catching and logging
- **Rate Limiting**: Built-in delays between transactions
- **Proxy Rotation**: Automatic proxy switching for enhanced privacy


## Troubleshooting

### Common Issues

1. **"No private keys found"**
   - Check your `.env` file format
   - Ensure variables are named correctly (`PRIVATE_KEY_1`, `MNEMONIC_1`, etc.)

2. **"Insufficient balance"**
   - Ensure your accounts have enough SUI tokens
   - Check balance using the built-in balance checker

3. **"Transaction failed"**
   - Check network connectivity
   - Verify proxy settings if using proxies
   - Ensure sufficient gas fees

4. **Proxy connection issues**
   - Verify proxy credentials and format
   - Test proxy connectivity independently

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Disclaimer

This bot is for educational and testing purposes on Sui testnet. Use at your own risk. Always verify transactions and understand the risks involved in automated trading.

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the logs for detailed error information

---

**⚠️ Important**: This bot operates on Sui testnet. Always test thoroughly before using on mainnet.