export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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