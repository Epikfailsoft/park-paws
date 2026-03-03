import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import dogspaceLogo from '@/assets/dogspace-logo.png';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Geçerli bir e-posta adresi girin');
const passwordSchema = z.string().min(6, 'Şifre en az 6 karakter olmalı');
const nameSchema = z.string().min(2, 'İsim en az 2 karakter olmalı');

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (!isLogin) {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('E-posta veya şifre hatalı');
          } else {
            toast.error('Giriş yapılamadı. Tekrar deneyin.');
          }
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Bu e-posta adresi zaten kayıtlı');
          } else {
            toast.error('Kayıt oluşturulamadı. Tekrar deneyin.');
          }
        } else {
          toast.success('Hoş geldin! Şimdi köpeğini ekle.');
          navigate('/onboarding');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      
      if (error) {
        toast.error(`${provider === 'google' ? 'Google' : 'Apple'} ile giriş yapılamadı`);
      }
    } catch (err) {
      toast.error('Bir hata oluştu. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top">
      {/* Header */}
      <div className="flex flex-col items-center pt-12 pb-8">
        <img src={dogspaceLogo} alt="Dogspace" className="h-20 w-20 rounded-2xl object-contain" />
        <h1 className="font-display text-2xl font-bold text-foreground">
          DOGSPACE
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mahallenin Dijital Parkı
        </p>
      </div>

      {/* Form Container */}
      <div className="flex-1 px-6">
        <div className="mx-auto max-w-sm">
          {/* Toggle */}
          <div className="mb-6 flex rounded-xl bg-secondary p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                isLogin 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground"
              )}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                !isLogin 
                  ? "bg-card text-foreground shadow-sm" 
                  : "text-muted-foreground"
              )}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Adınız
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adınızı girin"
                    className={cn(
                      "dogspace-input w-full pl-10",
                      errors.name && "border-destructive"
                    )}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className={cn(
                    "dogspace-input w-full pl-10",
                    errors.email && "border-destructive"
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    "dogspace-input w-full pl-10",
                    errors.password && "border-destructive"
                  )}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">veya</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Social Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-card py-3 font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google ile devam et
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-card py-3 font-medium text-foreground transition-all hover:bg-secondary disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple ile devam et
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Devam ederek{' '}
          <a href="#" className="text-primary underline">Kullanım Koşulları</a>
          {' '}ve{' '}
          <a href="#" className="text-primary underline">Gizlilik Politikası</a>
          'nı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}
