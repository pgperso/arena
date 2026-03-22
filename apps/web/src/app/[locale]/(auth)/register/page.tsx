import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Inscription',
};

export default async function RegisterPage() {
  const t = await getTranslations('auth');

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">{t('createAccount')}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('registerSubtitle')}
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
      <Footer />
    </div>
  );
}
