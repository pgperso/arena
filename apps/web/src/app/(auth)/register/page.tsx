import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Inscription',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
          <p className="mt-2 text-sm text-gray-500">
            Inscrivez-vous pour rejoindre vos communautés sportives
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
