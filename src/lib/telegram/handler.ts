import { BOT_TOKEN, BOT_USERNAME, WEBHOOK_URL, Update, TelegramMessage, CallbackQuery, InlineKeyboardMarkup, ParseMode } from './bot';
import {
  scanWallet,
  getWalletSummary,
  getTokenInfo,
  getTransaction,
  addAlert,
  removeAlert,
  getUserAlerts,
  validateSolanaAddress,
  validateSolanaSignature,
  validateTokenMint,
  AlertSubscription
} from './api';
import {
  getMessage,
  createMainMenuKeyboard,
  createScanKeyboard,
  createWalletKeyboard,
  createTokenKeyboard,
  createTxKeyboard,
  createAlertsKeyboard,
  createScanResultKeyboard,
  createWalletResultKeyboard,
  createTokenResultKeyboard,
  createTxResultKeyboard,
  createSettingsKeyboard,
  createHelpKeyboard,
} from './bot';
import {
  truncateAddress,
  escapeMarkdown,
  formatRiskLevel,
  formatScore,
  formatNumber,
} from './utils';

interface BotContext {
  update: Update;
  userId: number;
  chatId: number;
  username?: string;
  firstName?: string;
}

export class TelegramBot {
  private token: string;
  private botUsername: string;

  constructor(token: string, botUsername: string) {
    this.token = token;
    this.botUsername = botUsername;
  }

  async sendMessage(chatId: number | string, text: string, keyboard?: InlineKeyboardMarkup, parseMode: ParseMode = 'Markdown'): Promise<any> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        reply_markup: keyboard,
        disable_web_page_preview: true,
      }),
    });
    return res.json();
  }

  async editMessageText(chatId: number | string, messageId: number, text: string, keyboard?: InlineKeyboardMarkup, parseMode: ParseMode = 'Markdown'): Promise<any> {
    const url = `https://api.telegram.org/bot${this.token}/editMessageText`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: parseMode,
        reply_markup: keyboard,
        disable_web_page_preview: true,
      }),
    });
    return res.json();
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false): Promise<any> {
    const url = `https://api.telegram.org/bot${this.token}/answerCallbackQuery`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
    return res.json();
  }

  async setWebhook(url: string): Promise<any> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, allowed_updates: ['message', 'callback_query'] }),
    });
    return res.json();
  }

  async deleteWebhook(): Promise<any> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/deleteWebhook`, {
      method: 'POST',
    });
    return res.json();
  }

  async getMe(): Promise<any> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/getMe`);
    return res.json();
  }

  async handleUpdate(update: Update): Promise<void> {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from?.id;
    const text = message.text?.trim() || '';
    const username = message.from?.username;
    const firstName = message.from?.first_name || 'there';

    if (!userId) return;

    if (text.startsWith('/start')) {
      await this.sendMessage(chatId, getMessage('welcome', firstName), createMainMenuKeyboard());
      return;
    }

    if (text.startsWith('/help')) {
      await this.sendMessage(chatId, getMessage('help'), createHelpKeyboard());
      return;
    }

    if (text.startsWith('/about')) {
      await this.sendMessage(chatId, getMessage('about'), createMainMenuKeyboard());
      return;
    }

    if (text.startsWith('/settings')) {
      await this.sendMessage(chatId, getMessage('settings'), createSettingsKeyboard());
      return;
    }

    if (text.startsWith('/alerts') || text.startsWith('/alert')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const address = parts[1].trim();
        if (validateSolanaAddress(address)) {
          await this.handleAddAlert(chatId, userId, address);
        } else {
          await this.sendMessage(chatId, getMessage('noAddress'), createAlertsKeyboard(false));
        }
      } else {
        await this.handleListAlerts(chatId, userId);
      }
      return;
    }

    if (text.startsWith('/scan')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const address = parts[1].trim();
        if (validateSolanaAddress(address)) {
          await this.handleScan(chatId, userId, address);
        } else {
          await this.sendMessage(chatId, getMessage('noAddress'), createScanKeyboard());
        }
      } else {
        await this.sendMessage(chatId, getMessage('scanInput'), createScanKeyboard());
      }
      return;
    }

    if (text.startsWith('/wallet')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const address = parts[1].trim();
        if (validateSolanaAddress(address)) {
          await this.handleWallet(chatId, userId, address);
        } else {
          await this.sendMessage(chatId, getMessage('noAddress'), createWalletKeyboard());
        }
      } else {
        await this.sendMessage(chatId, getMessage('walletInput'), createWalletKeyboard());
      }
      return;
    }

    if (text.startsWith('/token')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const mint = parts[1].trim();
        if (validateTokenMint(mint)) {
          await this.handleToken(chatId, userId, mint);
        } else {
          await this.sendMessage(chatId, getMessage('noAddress'), createTokenKeyboard());
        }
      } else {
        await this.sendMessage(chatId, getMessage('tokenInput'), createTokenKeyboard());
      }
      return;
    }

    if (text.startsWith('/tx')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        const signature = parts[1].trim();
        if (validateSolanaSignature(signature)) {
          await this.handleTransaction(chatId, userId, signature);
        } else {
          await this.sendMessage(chatId, getMessage('noAddress'), createTxKeyboard());
        }
      } else {
        await this.sendMessage(chatId, getMessage('txInput'), createTxKeyboard());
      }
      return;
    }

    if (validateSolanaAddress(text)) {
      await this.handleScan(chatId, message.from!.id, text);
      return;
    }

    await this.sendMessage(chatId, getMessage('welcome', firstName), createMainMenuKeyboard());
  }

  private async handleCallbackQuery(callbackQuery: CallbackQuery): Promise<void> {
    const queryId = callbackQuery.id;
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id;
    const messageId = callbackQuery.message?.message_id;
    const data = callbackQuery.data || '';

    if (!chatId || !messageId) {
      await this.answerCallbackQuery(queryId, 'Message not found', true);
      return;
    }

    try {
      if (data === 'main_menu') {
        await this.editMainMenu(chatId, messageId);
      } else if (data.startsWith('scan_menu')) {
        await this.editMessageText(chatId, messageId, getMessage('scanInput'), createScanKeyboard());
      } else if (data.startsWith('wallet_menu')) {
        await this.editMessageText(chatId, messageId, getMessage('walletInput'), createWalletKeyboard());
      } else if (data.startsWith('token_menu')) {
        await this.editMessageText(chatId, messageId, getMessage('tokenInput'), createTokenKeyboard());
      } else if (data.startsWith('tx_menu')) {
        await this.editMessageText(chatId, messageId, getMessage('txInput'), createTxKeyboard());
      } else if (data === 'alert_list') {
        await this.handleListAlertsEdit(chatId, messageId, callbackQuery.from.id);
      } else if (data.startsWith('alert_add_menu')) {
        await this.editMessageText(chatId, messageId, getMessage('alertInput'), createAlertsKeyboard(false));
      } else if (data.startsWith('alert_remove_menu')) {
        await this.handleRemoveAlertMenu(chatId, messageId, callbackQuery.from.id);
      } else if (data.startsWith('settings_menu')) {
        await this.editMessageText(chatId, messageId, getMessage('settings'), createSettingsKeyboard());
      } else if (data.startsWith('help_')) {
        await this.handleHelpCallback(chatId, messageId, data);
      } else if (data.startsWith('scan_')) {
        await this.handleScanInput(chatId, messageId, callbackQuery.from.id, data);
      } else if (data.startsWith('wallet_')) {
        await this.handleWalletInput(chatId, messageId, callbackQuery.from.id, data);
      } else if (data.startsWith('token_')) {
        await this.handleTokenInput(chatId, messageId, callbackQuery.from.id, data);
      } else if (data.startsWith('tx_')) {
        await this.handleTxInput(chatId, messageId, callbackQuery.from.id, data);
      } else if (data.startsWith('alert_add_')) {
        await this.handleAddAlertCallback(chatId, messageId, callbackQuery.from.id, data);
      } else if (data.startsWith('alert_remove_')) {
        await this.handleRemoveAlertCallback(chatId, messageId, callbackQuery.from.id, data);
      } else if (data.startsWith('refresh_')) {
        await this.handleRefresh(chatId, messageId, callbackQuery.from.id, queryId, data);
      } else if (data === 'close') {
        await this.deleteMessage(chatId, messageId);
      } else if (data === 'about') {
        await this.editMessageText(chatId, messageId, getMessage('about'), createMainMenuKeyboard());
      } else {
        await this.answerCallbackQuery(queryId, 'Unknown action', true);
      }
    } catch (error) {
      console.error('Callback error:', error);
      await this.answerCallbackQuery(queryId, 'Error processing request', true);
    }
  }

  private async editMainMenu(chatId: number, messageId: number): Promise<void> {
    await this.editMessageText(chatId, messageId, getMessage('welcome', 'there'), createMainMenuKeyboard());
  }

  private async handleScanInput(chatId: number, messageId: number, userId: number, data: string): Promise<void> {
    if (data === 'scan_input' || data === 'scan_clipboard') {
      await this.editMessageText(chatId, messageId, getMessage('scanInput'), createScanKeyboard());
    } else if (data.startsWith('scan_') && data.length > 5) {
      const address = data.slice(5);
      await this.handleScanEdit(chatId, messageId, userId, address);
    }
  }

  private async handleWalletInput(chatId: number, messageId: number, userId: number, data: string): Promise<void> {
    if (data === 'wallet_input' || data === 'wallet_clipboard') {
      await this.editMessageText(chatId, messageId, getMessage('walletInput'), createWalletKeyboard());
    } else if (data.startsWith('wallet_') && data.length > 7) {
      const address = data.slice(7);
      await this.handleWalletEdit(chatId, messageId, userId, address);
    }
  }

  private async handleTokenInput(chatId: number, messageId: number, userId: number, data: string): Promise<void> {
    if (data === 'token_input' || data === 'token_clipboard') {
      await this.editMessageText(chatId, messageId, getMessage('tokenInput'), createTokenKeyboard());
    } else if (data.startsWith('token_') && data.length > 6) {
      const mint = data.slice(6);
      await this.handleTokenEdit(chatId, messageId, userId, mint);
    }
  }

  private async handleTxInput(chatId: number, messageId: number, userId: number, data: string): Promise<void> {
    if (data === 'tx_input' || data === 'tx_clipboard') {
      await this.editMessageText(chatId, messageId, getMessage('txInput'), createTxKeyboard());
    } else if (data.startsWith('tx_') && data.length > 3) {
      const signature = data.slice(3);
      await this.handleTransactionEdit(chatId, messageId, userId, signature);
    }
  }

  private async handleScan(chatId: number, userId: number, address: string): Promise<void> {
    await this.sendMessage(chatId, getMessage('scanning', address));
    try {
      const result = await scanWallet(address);
      await this.sendMessage(chatId, getMessage('scanResult', { ...result, address }), createScanResultKeyboard(address));
    } catch (error: any) {
      await this.sendMessage(chatId, getMessage('scanError', error.message), createScanKeyboard());
    }
  }

  private async handleScanEdit(chatId: number, messageId: number, userId: number, address: string): Promise<void> {
    await this.editMessageText(chatId, messageId, getMessage('scanning', address));
    try {
      const result = await scanWallet(address);
      await this.editMessageText(chatId, messageId, getMessage('scanResult', { ...result, address }), createScanResultKeyboard(address));
    } catch (error: any) {
      await this.editMessageText(chatId, messageId, getMessage('scanError', error.message), createScanKeyboard());
    }
  }

  private async handleWallet(chatId: number, userId: number, address: string): Promise<void> {
    try {
      const result = await getWalletSummary(address);
      await this.sendMessage(chatId, getMessage('walletResult', result), createWalletResultKeyboard(address));
    } catch (error: any) {
      await this.sendMessage(chatId, getMessage('scanError', error.message), createWalletKeyboard());
    }
  }

  private async handleWalletEdit(chatId: number, messageId: number, userId: number, address: string): Promise<void> {
    try {
      const result = await getWalletSummary(address);
      await this.editMessageText(chatId, messageId, getMessage('walletResult', result), createWalletResultKeyboard(address));
    } catch (error: any) {
      await this.editMessageText(chatId, messageId, getMessage('scanError', error.message), createWalletKeyboard());
    }
  }

  private async handleToken(chatId: number, userId: number, mint: string): Promise<void> {
    try {
      const result = await getTokenInfo(mint);
      await this.sendMessage(chatId, getMessage('tokenResult', { ...result, mint }), createTokenResultKeyboard(mint));
    } catch (error: any) {
      await this.sendMessage(chatId, getMessage('scanError', error.message), createTokenKeyboard());
    }
  }

  private async handleTokenEdit(chatId: number, messageId: number, userId: number, mint: string): Promise<void> {
    try {
      const result = await getTokenInfo(mint);
      await this.editMessageText(chatId, messageId, getMessage('tokenResult', { ...result, mint }), createTokenResultKeyboard(mint));
    } catch (error: any) {
      await this.editMessageText(chatId, messageId, getMessage('scanError', error.message), createTokenKeyboard());
    }
  }

  private async handleTransaction(chatId: number, userId: number, signature: string): Promise<void> {
    try {
      const result = await getTransaction(signature);
      await this.sendMessage(chatId, getMessage('txResult', { ...result, signature }), createTxResultKeyboard(signature));
    } catch (error: any) {
      await this.sendMessage(chatId, getMessage('scanError', error.message), createTxKeyboard());
    }
  }

  private async handleTransactionEdit(chatId: number, messageId: number, userId: number, signature: string): Promise<void> {
    try {
      const result = await getTransaction(signature);
      await this.editMessageText(chatId, messageId, getMessage('txResult', { ...result, signature }), createTxResultKeyboard(signature));
    } catch (error: any) {
      await this.editMessageText(chatId, messageId, getMessage('scanError', error.message), createTxKeyboard());
    }
  }

  private async handleAddAlert(chatId: number, userId: number, address: string): Promise<void> {
    try {
      await addAlert(userId, address, chatId);
      await this.sendMessage(chatId, getMessage('alertAdded', address), createAlertsKeyboard(true));
    } catch (error: any) {
      await this.sendMessage(chatId, getMessage('scanError', error.message), createAlertsKeyboard(false));
    }
  }

  private async handleAddAlertCallback(chatId: number, messageId: number, userId: number, data: string): Promise<void> {
    const address = data.slice(10);
    try {
      await addAlert(userId, address, chatId);
      await this.editMessageText(chatId, messageId, getMessage('alertAdded', address), createAlertsKeyboard(true));
    } catch (error: any) {
      await this.editMessageText(chatId, messageId, getMessage('scanError', error.message), createAlertsKeyboard(false));
    }
  }

  private async handleRemoveAlertMenu(chatId: number, messageId: number, userId: number): Promise<void> {
    const alerts = await getUserAlerts(userId);
    if (alerts.length === 0) {
      await this.editMessageText(chatId, messageId, getMessage('alertsList', []), createAlertsKeyboard(false));
      return;
    }
    const keyboard = {
      inline_keyboard: [
        ...alerts.map(a => [{ text: `🗑️ ${truncateAddress(a.address)}`, callback_data: `alert_remove_${a.address}` }]),
        [{ text: '🔙 Back', callback_data: 'alert_list' }],
      ],
    };
    await this.editMessageText(chatId, messageId, 'Select alert to remove:', keyboard);
  }

  private async handleRemoveAlertCallback(chatId: number, messageId: number, userId: number, data: string): Promise<void> {
    const address = data.slice(13);
    try {
      await removeAlert(userId, address);
      await this.editMessageText(chatId, messageId, getMessage('alertRemoved', address), createAlertsKeyboard(true));
    } catch (error: any) {
      await this.editMessageText(chatId, messageId, getMessage('scanError', error.message), createAlertsKeyboard(true));
    }
  }

  private async handleListAlerts(chatId: number, userId: number): Promise<void> {
    const alerts = await getUserAlerts(userId);
    const addresses = alerts.map(a => a.address);
    await this.sendMessage(chatId, getMessage('alertsList', addresses), createAlertsKeyboard(alerts.length > 0));
  }

  private async handleListAlertsEdit(chatId: number, messageId: number, userId: number): Promise<void> {
    const alerts = await getUserAlerts(userId);
    const addresses = alerts.map(a => a.address);
    await this.editMessageText(chatId, messageId, getMessage('alertsList', addresses), createAlertsKeyboard(alerts.length > 0));
  }

  private async handleHelpCallback(chatId: number, messageId: number, data: string): Promise<void> {
    const section = data.slice(5);
    let text = getMessage('help');
    let keyboard = createHelpKeyboard();

    if (section === 'commands') {
      text = getMessage('help');
    } else if (section === 'faq') {
      text = `
❓ *FAQ*

*Q: Is my wallet address stored?*
A: Scans are not saved as records. If you create an alert, its address and Telegram user/chat IDs are stored until you remove it.

*Q: Do you need my private key?*
A: Never. Solcurity only analyzes public blockchain data.

*Q: How accurate is the risk score?*
A: Based on public threat intelligence & on-chain analysis. Not a guarantee.

*Q: Can I scan any address?*
A: Yes, any valid Solana public address.

*Q: What is Token-2022?*
A: New SPL Token standard with extensions (fees, hooks, etc.). We detect these.
`;
    } else if (section === 'how') {
      text = `
📚 *How Solcurity Works*

1. *Input* → You provide a public Solana address
2. *RPC Query* → We fetch on-chain data via public RPC
3. *Analysis* → Our analyzers check:
   • Wallet age, balance, activity
   • Token holdings (SPL & Token-2022)
   • Transaction patterns
   • Program interactions
4. *Threat Intel* → Cross-reference with curated datasets
5. *Scoring* → 0-100 risk score with evidence
6. *Report* → Findings with severity & recommendations

*All data is public.* No private keys, no wallet connection.
`;
    } else if (section === 'privacy') {
      text = `
🔒 *Privacy Policy*

• No private keys or seed phrases ever requested
• No wallet connection required
• Public blockchain data only
• No cross-site tracking or analytics
• Alert addresses and Telegram IDs stored until alerts are removed
• Telegram is used to deliver bot messages
• Open source: ${process.env.NEXT_PUBLIC_APP_URL || 'https://github.com/LightxSolami/Solcurity'}

*Your security, your control.*
`;
    }
    await this.editMessageText(chatId, messageId, text, createHelpKeyboard());
  }

  private async handleRefresh(
    chatId: number,
    messageId: number,
    userId: number,
    queryId: string,
    data: string,
  ): Promise<void> {
    const parts = data.split('_');
    if (parts.length < 3) return;

    const type = parts[1];
    const identifier = parts.slice(2).join('_');

    try {
      if (type === 'scan') {
        await this.handleScanEdit(chatId, messageId, userId, identifier);
      } else if (type === 'wallet') {
        await this.handleWalletEdit(chatId, messageId, userId, identifier);
      } else if (type === 'token') {
        await this.handleTokenEdit(chatId, messageId, userId, identifier);
      } else if (type === 'tx') {
        await this.handleTransactionEdit(chatId, messageId, userId, identifier);
      }
    } catch (error: any) {
      console.error("Telegram refresh failed:", error);
      await this.answerCallbackQuery(queryId, 'Refresh failed', true);
    }
  }

  private async deleteMessage(chatId: number, messageId: number): Promise<void> {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  }

  async processUpdate(update: Update): Promise<void> {
    await this.handleUpdate(update);
  }
}

export const bot = new TelegramBot(BOT_TOKEN || '', BOT_USERNAME);
export default bot;