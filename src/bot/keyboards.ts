import { InlineKeyboard } from 'grammy';

export function qualityKeyboard(qualities: string[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  const priority = ['1080p', '720p', '480p', '360p'];

  const sorted = [...new Set([...qualities, ...priority])]
    .filter((q) => qualities.includes(q) || priority.includes(q))
    .sort((a, b) => priority.indexOf(b) - priority.indexOf(a));

  for (const q of sorted.slice(0, 4)) {
    kb.text(`🎬 ${q}`, `dl:${q}`);
  }
  kb.text(`🎵 فقط صدا (MP3)`, 'dl:audio');
  return kb;
}

export function cancelKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('❌ لغو', 'cancel');
}

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📊 آمار من', 'menu:stats')
    .text('⚙️ تنظیمات', 'menu:settings')
    .row()
    .text('💎 اشتراک پرمیوم', 'menu:premium')
    .text('❓ راهنما', 'menu:help');
}

export function premiumKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('💎 ماهانه - ۵۰', 'pay:month')
    .row()
    .text('💎 سه‌ماهه - ۱۲۰', 'pay:3months')
    .row()
    .text('💎 سالانه - ۴۰۰', 'pay:year');
}
