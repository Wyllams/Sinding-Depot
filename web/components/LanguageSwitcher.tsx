'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setUserLocale } from '@/app/actions/i18n';
import { Locale } from '@/src/i18n/config';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
  const t = useTranslations('Common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLanguageChange = (locale: Locale) => {
    startTransition(async () => {
      await setUserLocale(locale);
      window.location.reload(); // Força o reload completo para aplicar o idioma em todo o sistema
    });
  };

  return (
    <div className="relative inline-block text-left opacity-90 hover:opacity-100 transition-opacity">
      <select 
        disabled={isPending}
        className="block w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        defaultValue=""
      >
        <option value="" disabled hidden>{t('language')}</option>
        <option value="en">🇺🇸 {t('english')}</option>
        <option value="es">🇪🇸 {t('spanish')}</option>
        <option value="pt">🇧🇷 {t('portuguese')}</option>
      </select>
    </div>
  );
}
