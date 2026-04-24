import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, COOKIE_NAME } from './config';

export default getRequestConfig(async () => {
  // 1. Lê o idioma escolhido do Cookie
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_NAME)?.value || defaultLocale;

  // 2. Retorna o dicionário de palavras correspondente
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
