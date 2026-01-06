import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Loader2, AlertCircle, Lock, Mail, User, UserPlus } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError(null);
    setSuccessMessage(null);
  };

  const toggleMode = () => {
    resetForm();
    setIsRegisterMode(!isRegisterMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (isRegisterMode) {
      // Validações do registro
      if (password !== confirmPassword) {
        setError('As senhas não coincidem');
        setIsLoading(false);
        return;
      }
      
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        setIsLoading(false);
        return;
      }

      if (!displayName.trim()) {
        setError('Nome é obrigatório');
        setIsLoading(false);
        return;
      }

      const result = await register(email, password, displayName.trim());
      
      setIsLoading(false);
      
      if (result.success) {
        setSuccessMessage('Conta criada com sucesso! Fazendo login...');
        setTimeout(() => onSuccess(), 1500);
      } else {
        setError(result.error || 'Erro ao criar conta');
      }
    } else {
      const result = await login(email, password);
      
      setIsLoading(false);
      
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {isRegisterMode ? 'Criar Conta' : 'Área Administrativa'}
          </h1>
          <p className="text-gray-400">
            {isRegisterMode ? 'Crie sua conta para acessar o sistema' : 'Faça login para gerenciar eventos'}
          </p>
        </div>

        {/* Login/Register Form */}
        <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg flex items-center gap-3">
                <AlertCircle className="shrink-0" size={20} />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-900/50 border border-green-500 text-green-200 p-4 rounded-lg flex items-center gap-3">
                <ShieldCheck className="shrink-0" size={20} />
                <span>{successMessage}</span>
              </div>
            )}

            {isRegisterMode && (
              <div>
                <label className="block text-gray-400 text-sm mb-2">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-11 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray-400 text-sm mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-11 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-11 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-gray-400 text-sm mb-2">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-11 text-white focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>{isRegisterMode ? 'Criando conta...' : 'Entrando...'}</span>
                </>
              ) : (
                <>
                  {isRegisterMode ? <UserPlus size={20} /> : <Lock size={20} />}
                  <span>{isRegisterMode ? 'Criar Conta' : 'Entrar'}</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <button
              onClick={toggleMode}
              className="text-brand-400 hover:text-brand-300 font-medium transition"
            >
              {isRegisterMode 
                ? 'Já tem uma conta? Faça login' 
                : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          {isRegisterMode 
            ? 'Novos usuários recebem acesso básico. Contate o admin para mais permissões.'
            : 'Acesso restrito a usuários autorizados'}
        </p>
      </div>
    </div>
  );
};
