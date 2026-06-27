import type { BotContext } from '../middlewares/user.js';
import { User } from '../../models/User.js';
import { fa } from '../../locales/fa.js';
import { settingsKeyboard, mainMenuKeyboard } from '../keyboards.js';
import { logger } from '../../utils/logger.js';

export async function handleSettingsQuality(ctx: BotContext, quality: string) {
  await ctx.answerCallbackQuery();

  const user = ctx.session.user;
  if (!user) return;

  await User.updateOne(
    { telegramId: user.telegramId },
    { $set: { 'settings.defaultQuality': quality } },
  );

  await ctx.editMessageText(
    fa.settingsQualityChanged(quality),
    {
      parse_mode: 'Markdown',
      reply_markup: settingsKeyboard({
        defaultQuality: quality,
        preferAudio: user.settings?.preferAudio || false,
      }),
    },
  );
}

export async function handleSettingsAudioToggle(ctx: BotContext) {
  await ctx.answerCallbackQuery();

  const user = ctx.session.user;
  if (!user) return;

  const newPreferAudio = !user.settings?.preferAudio;

  await User.updateOne(
    { telegramId: user.telegramId },
    { $set: { 'settings.preferAudio': newPreferAudio } },
  );

  await ctx.editMessageText(
    fa.settingsAudioToggled(newPreferAudio),
    {
      parse_mode: 'Markdown',
      reply_markup: settingsKeyboard({
        defaultQuality: user.settings?.defaultQuality || '720p',
        preferAudio: newPreferAudio,
      }),
    },
  );
}

export async function handleMenuBack(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    '🎬 **به ربات مدیا دانلودر خوش آمدید!**\n\nلینک مورد نظرتون رو بفرستید.',
    {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(),
    },
  );
}

export async function handleMenuStats(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const { statsCommand } = await import('../commands/stats.js');
  await statsCommand(ctx);
}

export async function handleMenuSettings(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const { settingsCommand } = await import('../commands/settings.js');
  await settingsCommand(ctx);
}

export async function handleMenuPremium(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const { premiumCommand } = await import('../commands/premium.js');
  await premiumCommand(ctx);
}

export async function handleMenuHistory(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const { historyCommand } = await import('../commands/history.js');
  await historyCommand(ctx);
}

export async function handleMenuHelp(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  const { helpCommand } = await import('../commands/help.js');
  await helpCommand(ctx);
}
