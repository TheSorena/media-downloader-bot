import type { BotContext } from '../middlewares/user.js';
import { User } from '../../models/User.js';
import { Download } from '../../models/Download.js';
import { fa } from '../../locales/fa.js';
import { formatBytes, getDayKey } from '../../utils/formatter.js';
import { adminKeyboard, confirmKeyboard, backToMenuKeyboard } from '../keyboards.js';
import { logger } from '../../utils/logger.js';

export async function handleAdminStats(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const { adminCommand } = await import('../commands/admin.js');
  await adminCommand(ctx);
}

export async function handleAdminUsers(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const users = await User.find()
    .sort({ lastActiveAt: -1 })
    .limit(10)
    .lean();

  const formatted = users.map((u: any) => ({
    name: u.firstName || 'نامشخص',
    username: u.username || '',
    isPremium: u.isPremium && (!u.premiumUntil || u.premiumUntil > new Date()),
    downloads: u.downloadCount || 0,
    lastActive: new Date(u.lastActiveAt).toLocaleDateString('fa-IR'),
  }));

  await ctx.editMessageText(fa.adminUserList(formatted), {
    parse_mode: 'Markdown',
    reply_markup: backToMenuKeyboard(),
  });
}

export async function handleAdminRecent(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const downloads = await Download.find()
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const formatted = downloads.map((dl: any) => ({
    title: (dl.title || 'بدون عنوان').slice(0, 40),
    user: String(dl.telegramId),
    platform: dl.platform || 'نامشخص',
    status: dl.status || 'unknown',
    date: new Date(dl.createdAt).toLocaleDateString('fa-IR'),
  }));

  await ctx.editMessageText(fa.adminRecentDownloads(formatted), {
    parse_mode: 'Markdown',
    reply_markup: backToMenuKeyboard(),
  });
}

export async function handleAdminBroadcast(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const user = ctx.session.user;
  if (!user) return;

  const { config } = await import('../../config/index.js');
  if (!config.bot.adminIds.includes(user.telegramId)) return;

  (globalThis as any).__broadcastChatId = ctx.chat?.id;
  (globalThis as any).__broadcastMsgId = ctx.message?.message_id;

  await ctx.reply(fa.broadcastPrompt, { reply_markup: backToMenuKeyboard() });
}

export async function handleBroadcastMessage(ctx: BotContext, text: string) {
  const chatId = (globalThis as any).__broadcastChatId;
  if (!chatId || ctx.chat?.id !== chatId) return false;

  if (text === '/cancel') {
    await ctx.reply(fa.broadcastCancelled);
    delete (globalThis as any).__broadcastChatId;
    return true;
  }

  const users = await User.find({ isBanned: false }).lean();
  let sentCount = 0;

  for (const user of users) {
    try {
      await ctx.api.sendMessage(user.telegramId, text, { parse_mode: 'Markdown' });
      sentCount++;
    } catch {
      // User might have blocked the bot
    }
  }

  await ctx.reply(fa.broadcastSuccess(sentCount));
  delete (globalThis as any).__broadcastChatId;
  return true;
}

export async function handleAdminCancel(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  delete (globalThis as any).__broadcastChatId;
  await ctx.editMessageText('❌ عملیات لغو شد.', {
    reply_markup: backToMenuKeyboard(),
  });
}
