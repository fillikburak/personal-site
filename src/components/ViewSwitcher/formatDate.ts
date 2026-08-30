// Docusaurus locale codes ('en', 'tr') aren't valid BCP 47 tags for
// Intl formatting on their own — map to a real region so dates render
// correctly (e.g. "30 Ağu" instead of "Aug 30" for Turkish).
const INTL_LOCALES: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
};

export function formatDate(date: string, currentLocale: string): string {
  const intlLocale = INTL_LOCALES[currentLocale] ?? currentLocale;
  return new Date(date).toLocaleDateString(intlLocale, {
    month: 'short',
    day: 'numeric',
  });
}
