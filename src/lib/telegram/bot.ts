import type { Chat, InlineKeyboardMarkup, Message, User } from './types';

const vercelUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const BOT_TOKEN = process.env.BOT_TOKEN || "";
export const BOT_USERNAME = (process.env.BOT_USERNAME || "SolcurityBot").replace(/^@/, "");
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || vercelUrl).replace(/\/+$/, "");
export const WEBHOOK_URL = (process.env.WEBHOOK_URL || APP_URL).replace(/\/+$/, "");

export type TelegramChat = Chat;
export type TelegramMessage = Message;
export type { InlineKeyboardMarkup, ParseMode, TelegramUser } from "./types";

export interface CallbackQuery {
  id: string;
  from: User;
  message?: Message;
  chat_instance: string;
  data?: string;
}

export interface Update {
  update_id: number;
  message?: Message;
  callback_query?: CallbackQuery;
}

export const COMMANDS = [
  { command: "start", description: "Open the Solcurity menu" },
  { command: "scan", description: "Scan a public wallet address" },
  { command: "wallet", description: "Get a wallet summary" },
  { command: "token", description: "Inspect a token mint" },
  { command: "tx", description: "Decode a transaction" },
  { command: "alerts", description: "Manage activity alerts" },
  { command: "help", description: "Show help" },
] as const;

export const CALLBACK_ACTIONS = {
  mainMenu: "main_menu",
  scanMenu: "scan_menu",
  walletMenu: "wallet_menu",
  tokenMenu: "token_menu",
  transactionMenu: "tx_menu",
  alerts: "alert_list",
  settings: "settings_menu",
  help: "help_commands",
} as const;

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

export function formatRiskLevel(level: string): { emoji: string; label: string } {
  switch (level?.toLowerCase()) {
    case 'critical':
      return { emoji: '🔴', label: 'CRITICAL' };
    case 'high':
      return { emoji: '🟠', label: 'HIGH' };
    case 'medium':
      return { emoji: '🟡', label: 'MEDIUM' };
    case 'low':
      return { emoji: '🟢', label: 'LOW' };
    case 'info':
      return { emoji: '🔵', label: 'INFO' };
    default:
      return { emoji: '⚪', label: 'UNKNOWN' };
  }
}

export function formatScore(score: number): string {
  if (score >= 80) return `🔴 ${score}/100`;
  if (score >= 60) return `🟠 ${score}/100`;
  if (score >= 40) return `🟡 ${score}/100`;
  if (score >= 20) return `🟢 ${score}/100`;
  return `🔵 ${score}/100`;
}

export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toString();
}

export const MESSAGES = {
  welcome: (name: string) => `
🛡️ *Welcome to Solcurity, ${name}!*

Your personal Solana wallet security assistant. I can help you:

🔍 *Scan wallets* for risks & suspicious activity
💰 *Check wallet balances* & token holdings
🪙 *Analyze tokens* for Token-2022 extensions
📝 *Decode transactions* to see what happened
🔔 *Set alerts* for address activity

*Privacy-first:* No keys or wallet connection. Alert addresses and Telegram IDs are stored until you remove an alert.

Tap a button below to get started:
`,

  help: `
📖 *Solcurity Bot Commands*

/start — Show main menu
/scan \`<address>\` — Full security scan
/wallet \`<address>\` — Quick wallet summary
/token \`<mint>\` — Token analysis
/tx \`<signature>\` — Decode transaction
/alert \`<address>\` — Set activity alert
/alerts — List your alerts
/settings — Bot settings
/help — This message
/about — About Solcurity

*Inline Buttons:* Most actions work via buttons below messages.

*Examples:*
\`/scan 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`
\`/wallet 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`
\`/token EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`

*Privacy:* We never store private keys. Alert subscriptions store the address and Telegram user/chat IDs until removed.
`,

  scanInput: `
🔍 *Scan Wallet*

Send me a Solana address to scan, or paste it here.

*Format:* Base58 address (32-44 chars)
*Example:* \`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`

Or tap "From Clipboard" if you copied one.
`,

  walletInput: `
💰 *Quick Wallet Check*

Send me a Solana address for a quick summary.

*Includes:* SOL balance, token count, recent activity, first/last seen.
*Faster than full scan.*
`,

  tokenInput: `
🪙 *Token Analysis*

Send me a token mint address to analyze.

*Checks:* Token-2022 extensions, authorities, and supply. Name, symbol, and holder count may be unavailable.
*Example:* \`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\` (USDC)
`,

  txInput: `
📝 *Transaction Decoder*

Send me a transaction signature to decode.

*Shows:* Parsed instructions and token balance changes when RPC data is available.
*Example:* \`5KVuq...7xJ2p\` (88 chars)
`,

  alertInput: `
🔔 *Set Activity Alert*

Send \`/alert <address>\` to start monitoring a wallet.

*You'll get notified for:*
• New transactions
• Risk level changes
• Native SOL balance changes of at least 100 SOL
• Program interactions

*Format:* \`/alert <address>\`
`,

  noAddress: `
❌ *Invalid Address*

Please provide a valid Solana address (Base58, 32-44 characters).

*Example:* \`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM\`
`,

  scanning: (address: string) => `
🔍 *Scanning...* ${truncateAddress(address)}

Analyzing wallet for risks, token holdings, transaction patterns, and program interactions. This may take a few seconds.
`,

  scanError: (error: string) => `
❌ *Scan Failed*

${error}

Please try again or check the address is valid.
`,

  scanResult: (data: any) => {
    const { address, score, riskLevel, summary, wallet, findings } = data;
    const risk = formatRiskLevel(riskLevel);

    let msg = `
${risk.emoji} *Scan Complete* ${risk.emoji}

📍 *Address:* \`${truncateAddress(address)}\`
${formatScore(score)} • ${risk.label}

*Summary:*
• ${summary?.criticalCount || 0} Critical • ${summary?.highCount || 0} High
• ${summary?.mediumCount || 0} Medium • ${summary?.lowCount || 0} Low
• ${summary?.infoCount || 0} Info
`;

    if (wallet) {
      msg += `
💰 *Wallet:*
• Balance: ${wallet.solBalance?.toFixed(4) || '0'} SOL
• Tokens: ${wallet.tokenAccounts || 0}
• TXs: ${wallet.transactionCount || 0}
• Age: ${wallet.approximateAgeDays || 0} days
`;
    }

    if (findings && findings.length > 0) {
      msg += `
⚠️ *Top Findings:*
`;
      findings.slice(0, 3).forEach((f: any) => {
        const fRisk = formatRiskLevel(f.severity);
        msg += `${fRisk.emoji} ${f.title}\n`;
      });
      if (findings.length > 3) {
        msg += `... and ${findings.length - 3} more\n`;
      }
    }

    msg += `
_Scan ID: ${data.scanId || 'N/A'} • ${new Date().toLocaleString()}_
`;
    return msg;
  },

  walletResult: (data: any) => {
    const { address, wallet } = data;
    let msg = `
💰 *Wallet Summary* ${truncateAddress(address)}

💎 *SOL Balance:* ${wallet?.solBalance?.toFixed(4) || '0'} SOL
🪙 *Tokens:* ${wallet?.tokenAccounts || 0} accounts
📝 *Transactions:* ${wallet?.transactionCount || 0}
📅 *First Seen:* ${wallet?.firstActivity ? new Date(wallet.firstActivity).toLocaleDateString() : 'Unknown'}
📅 *Last Active:* ${wallet?.lastActivity ? new Date(wallet.lastActivity).toLocaleDateString() : 'Unknown'}
🏷️ *Age:* ${wallet?.approximateAgeDays || 0} days
`;
    return msg;
  },

  tokenResult: (data: any) => {
    const { token } = data;
    if (!token) return '❌ Token not found';

    let msg = `
🪙 *Token Analysis*

📍 *Mint:* \`${truncateAddress(data.mint)}\`
📛 *Name:* ${token.name || 'Unknown'}
🏷️ *Symbol:* ${token.symbol || 'Unknown'}
🔢 *Decimals:* ${token.decimals || 0}
💰 *Supply:* ${formatNumber(token.supply || 0)}
👥 *Holders:* ${token.holders == null ? 'Unavailable' : formatNumber(token.holders)}

⚙️ *Authorities:*
• Mint: ${token.mintAuthority ? '✅ Active' : '🔒 Revoked'}
• Freeze: ${token.freezeAuthority ? '✅ Active' : '🔒 Revoked'}

🔧 *Token-2022 Extensions:*
`;
    if (token.extensions && token.extensions.length > 0) {
      token.extensions.forEach((ext: string) => {
        msg += `• ${ext}\n`;
      });
    } else {
      msg += '• None detected (standard SPL Token)\n';
    }
    return msg;
  },

  txResult: (data: any) => {
    const tx = data.tx ?? data;
    if (!tx?.signature) return '❌ Transaction not found';

    let msg = `
📝 *Transaction Decoded*

📍 *Signature:* \`${truncateAddress(data.signature, 8)}\`
📦 *Slot:* ${tx.slot}
⛽ *Fee:* ${tx.meta?.fee ?? 'Unknown'} lamports
✅ *Success:* ${tx.meta?.err === null ? 'Yes' : tx.meta?.err === 'unknown' ? 'Unknown' : 'No'}
📅 *Time:* ${tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : 'Unknown'}

📋 *Instructions:* ${tx.transaction?.message?.instructions?.length || 0}
`;

    if (tx.meta?.postTokenBalances && tx.meta.preTokenBalances) {
      const transfers = tx.meta.postTokenBalances
        .map((post: any, i: number) => {
          const pre = tx.meta.preTokenBalances[i];
          const diff = (post.uiTokenAmount?.uiAmount || 0) - (pre?.uiTokenAmount?.uiAmount || 0);
          if (diff !== 0) {
            return `${diff > 0 ? '+' : ''}${diff} ${post.mint?.slice(0, 8)}...`;
          }
          return null;
        })
        .filter(Boolean);

      if (transfers.length > 0) {
        msg += `\n💸 *Token Transfers:*\n${transfers.slice(0, 5).join('\n')}`;
        if (transfers.length > 5) msg += `\n... and ${transfers.length - 5} more`;
      }
    }

    return msg;
  },

  alertAdded: (address: string) => `
✅ *Alert Set*

Now monitoring: \`${truncateAddress(address)}\`

You'll receive notifications for:
• New transactions
• Risk level changes
• Large SOL transfers (100 SOL or more)
• Program interactions

Checks run about every five minutes. The first check establishes a baseline.
`,

  alertRemoved: (address: string) => `
✅ *Alert Removed*

Stopped monitoring: \`${truncateAddress(address)}\`
`,

  alertsList: (alerts: string[]) => {
    if (!alerts || alerts.length === 0) {
      return `
🔔 *Your Alerts*

No active alerts. Tap "Add Alert" to start monitoring an address.
`;
    }
    let msg = `🔔 *Your Alerts (${alerts.length})*\n\n`;
    alerts.forEach((addr, i) => {
      msg += `${i + 1}. \`${truncateAddress(addr)}\`\n`;
    });
    msg += '\nTap an alert to manage it.';
    return msg;
  },

  settings: `
⚙️ *Settings*

🔔 *Notifications:* Enabled
🌐 *Language:* English
🔑 *API Key:* Not set
📊 *Auto-refresh:* 30s

Tap a button to change settings.
`,

  about: `
ℹ️ *About Solcurity*

🛡️ *Free Solana Wallet Security Scanner*

• Public address only — no keys needed
• Analyzes on-chain data for risks
• 0-100 risk score with evidence
• Token-2022 extension detection
• Drainer/scam program identification
• Transaction pattern analysis

🌐 *Web App:* ${APP_URL}
📖 *Docs:* ${APP_URL}/how-it-works
🔒 *Privacy:* ${APP_URL}/privacy

*Built for the Solana ecosystem*
`,

  rateLimited: `
⏳ *Rate Limited*

Too many requests. Please wait a moment and try again.

Free tier: 10 scans/minute per user.
`,

  maintenance: `
🔧 *Maintenance Mode*

Service temporarily unavailable. Please try again later.
`,
};

export function getMessage(key: keyof typeof MESSAGES, ...args: any[]): string {
  const msg = MESSAGES[key];
  if (typeof msg === 'function') {
    return Reflect.apply(msg, undefined, args) as string;
  }
  return msg;
}

const callbackButton = (text: string, callback_data: string) => ({ text, callback_data });

export function createMainMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("🔍 Scan wallet", "scan_menu"), callbackButton("💰 Wallet summary", "wallet_menu")],
      [callbackButton("🪙 Token analysis", "token_menu"), callbackButton("📝 Decode transaction", "tx_menu")],
      [callbackButton("🔔 Alerts", "alert_list"), callbackButton("⚙️ Settings", "settings_menu")],
      [callbackButton("❓ Help", "help_commands"), callbackButton("ℹ️ About", "about")],
    ],
  };
}

export function createScanKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("Enter wallet address", "scan_input")],
      [callbackButton("🔙 Main menu", "main_menu")],
    ],
  };
}

export function createWalletKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("Enter wallet address", "wallet_input")],
      [callbackButton("🔙 Main menu", "main_menu")],
    ],
  };
}

export function createTokenKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("Enter token mint", "token_input")],
      [callbackButton("🔙 Main menu", "main_menu")],
    ],
  };
}

export function createTxKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("Enter transaction signature", "tx_input")],
      [callbackButton("🔙 Main menu", "main_menu")],
    ],
  };
}

export function createAlertsKeyboard(hasAlerts = false): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("➕ Add alert", "alert_add_menu"), callbackButton("📋 List alerts", "alert_list")],
      ...(hasAlerts ? [[callbackButton("➖ Remove alert", "alert_remove_menu")]] : []),
      [callbackButton("🔙 Main menu", "main_menu")],
    ],
  };
}

export function createScanResultKeyboard(address: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("🔄 Refresh scan", `refresh_scan_${address}`)],
      [callbackButton("New scan", "scan_menu"), callbackButton("Main menu", "main_menu")],
    ],
  };
}

export function createWalletResultKeyboard(address: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("🔄 Refresh wallet", `refresh_wallet_${address}`)],
      [callbackButton("New wallet", "wallet_menu"), callbackButton("Main menu", "main_menu")],
    ],
  };
}

export function createTokenResultKeyboard(mint: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("🔄 Refresh token", `refresh_token_${mint}`)],
      [callbackButton("New token", "token_menu"), callbackButton("Main menu", "main_menu")],
    ],
  };
}

export function createTxResultKeyboard(signature: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "View on Solscan", url: `https://solscan.io/tx/${encodeURIComponent(signature)}` }],
      [callbackButton("Decode another", "tx_menu"), callbackButton("Main menu", "main_menu")],
    ],
  };
}

export function createSettingsKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[callbackButton("🔙 Main menu", "main_menu")]],
  };
}

export function createHelpKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [callbackButton("Commands", "help_commands"), callbackButton("FAQ", "help_faq")],
      [callbackButton("How it works", "help_how"), callbackButton("Privacy", "help_privacy")],
      [callbackButton("🔙 Main menu", "main_menu")],
    ],
  };
}