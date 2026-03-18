import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Connexion',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="mt-2 text-sm text-gray-500">
            Connectez-vous pour rejoindre vos communautés
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
