import { InlineKeyboard } from 'grammy';

export function qualityKeyboard(qualities: string[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  const priority = ['1080p', '720p', '480p', '360p'];

  const sorted = [...new Set([...qualities, ...priority])]
    .filter((q) => qualities.includes(q) || priority.includes(q))
    .sort((a, b) => priority.indexOf(b) - priority.indexOf(a));

  for (const q of sorted.slice(0, 4)) {
    kb.text({ text: `🎬 ${q}`, style: 'primary' }, `dl:${q}`);
  }
  kb.text('🎵 فقط صدا (MP3)', 'dl:audio');
  kb.row();
  kb.text({ text: '❌ لغو', style: 'danger' }, 'cancel');
  return kb;
}

export function cancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text({ text: '❌ لغو', style: 'danger' }, 'cancel');
}

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text({ text: '📊 آمار من', style: 'primary' }, 'menu:stats')
    .text('⚙️ تنظیمات', 'menu:settings')
    .row()
    .text({ text: '💎 اشتراک پرمیوم', style: 'primary' }, 'menu:premium')
    .text('📜 تاریخچه', 'menu:history')
    .row()
    .text('❓ راهنما', 'menu:help');
}

export function premiumKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('💎 ماهانه - ۵۰,۰۰۰ تومان', 'pay:month')
    .row()
    .text({ text: '💎 سه‌ماهه - ۱۲۰,۰۰۰ تومان', style: 'primary' }, 'pay:3months')
    .row()
    .text({ text: '💎 سالانه - ۴۰۰,۰۰۰ تومان', style: 'success' }, 'pay:year')
    .row()
    .text({ text: '❌ بازگشت', style: 'danger' }, 'menu:back');
}

export function settingsKeyboard(userSettings: { defaultQuality: string; preferAudio: boolean }): InlineKeyboard {
  const qualities = ['1080p', '720p', '480p', '360p'];
  const kb = new InlineKeyboard();

  for (const q of qualities) {
    const style = q === userSettings.defaultQuality ? 'primary' : undefined;
    const prefix = q === userSettings.defaultQuality ? '✓ ' : '';
    if (style) {
      kb.text({ text: `${prefix}${q}`, style }, `set:quality:${q}`);
    } else {
      kb.text(`${prefix}${q}`, `set:quality:${q}`);
    }
  }

  kb.row();
  const audioPrefix = userSettings.preferAudio ? '✓ ' : '';
  const audioStyle = userSettings.preferAudio ? 'primary' : undefined;
  if (audioStyle) {
    kb.text({ text: `${audioPrefix}🎵 فقط صدا`, style: audioStyle }, 'set:audio:toggle');
  } else {
    kb.text(`${audioPrefix}🎵 فقط صدا`, 'set:audio:toggle');
  }

  kb.row();
  kb.text({ text: '🔙 بازگشت', style: 'danger' }, 'menu:back');
  return kb;
}

export function adminKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text({ text: '📊 آمار کلی', style: 'primary' }, 'admin:stats')
    .text('👥 کاربران', 'admin:users')
    .row()
    .text({ text: '📢 ارسال پیام', style: 'primary' }, 'admin:broadcast')
    .text('📜 دانلودهای اخیر', 'admin:recent')
    .row()
    .text({ text: '🔙 بازگشت', style: 'danger' }, 'menu:back');
}

export function confirmKeyboard(action: string, target?: string): InlineKeyboard {
  const data = target ? `admin:${action}:${target}` : `admin:${action}`;
  return new InlineKeyboard()
    .text({ text: '✅ تأیید', style: 'primary' }, data)
    .text({ text: '❌ لغو', style: 'danger' }, 'admin:cancel');
}

export function backToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🔙 بازگشت به منو', 'menu:back');
}

export function forceJoinKeyboard(channelUsername: string, channelLink: string): InlineKeyboard {
  return new InlineKeyboard()
    .url({ text: '📢 عضویت در کانال', style: 'primary' }, channelLink)
    .row()
    .text({ text: '✅ عضو شدم', style: 'primary' }, 'forcejoin:check');
}

export function progressKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text({ text: '🛑 لغو دانلود', style: 'danger' }, 'download:cancel');
}
