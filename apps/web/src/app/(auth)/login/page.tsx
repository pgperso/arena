import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Connexion',
};

export default function LoginPage() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
            <p className="mt-2 text-sm text-gray-500">
              Connectez-vous pour rejoindre vos tribunes
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
      <Footer />
    </div>
  );
}
