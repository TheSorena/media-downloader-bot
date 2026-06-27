import type { Middleware } from 'grammy';
import type { BotContext } from './user.js';
import { config } from '../../config/index.js';
import { forceJoinKeyboard } from '../keyboards.js';
import { fa } from '../../locales/fa.js';

export const forceJoinMiddleware: Middleware<BotContext> = async (ctx, next) => {
  if (!config.channel.forceJoin) {
    return next();
  }

  const user = ctx.session.user;
  if (!user) return next();

  if (user.isPremiumActive()) return next();

  try {
    const member = await ctx.api.getChatMember(config.channel.forceJoin, ctx.from!.id);
    if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
      return next();
    }
  } catch (err) {
    return next();
  }

  await ctx.reply(
    fa.forceJoinRequired(config.channel.forceJoin),
    {
      parse_mode: 'Markdown',
      reply_markup: forceJoinKeyboard(config.channel.forceJoin, config.channel.forceJoinLink),
    },
  );
};
