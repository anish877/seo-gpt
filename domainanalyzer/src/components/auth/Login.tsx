import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// removed unused Card imports
import { Label } from '@/components/ui/label';
// removed unused Alert imports
import { Eye, EyeOff, Mail, Loader2 } from 'lucide-react';
// removed unused Link import

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const displayError = formError || error;

  return (
    <div className="w-full px-6">
      <div className="w-full max-w-sm mx-auto rounded-2xl border border-gray-200 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur p-6 sm:p-8 shadow-sm">
        {/* Apple-style clean header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            {/* Simple, clean logo area - replace with your logo */}
            <div className="w-16 h-16 mx-auto bg-black rounded-2xl flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Sign In
          </h1>
          <p className="text-base text-gray-600">
            Enter your credentials to continue
          </p>
        </div>

        {/* Apple-style form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600">{displayError}</p>
            </div>
          )}
          
          {/* Email field with Apple's floating label style */}
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="peer w-full h-14 px-4 pt-6 pb-2 text-base border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none bg-white transition-colors"
              disabled={loading}
            />
            <Label 
              htmlFor="email" 
              className="absolute left-4 top-4 text-gray-500 text-base transition-all duration-200 
                         peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                         peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500
                         peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-700"
            >
              Email Address
            </Label>
          </div>
  
          {/* Password field with Apple's floating label style */}
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="peer w-full h-14 px-4 pt-6 pb-2 pr-12 text-base border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-0 focus:outline-none bg-white transition-colors"
              disabled={loading}
            />
            <Label 
              htmlFor="password" 
              className="absolute left-4 top-4 text-gray-500 text-base transition-all duration-200
                         peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500
                         peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-500
                         peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-gray-700"
            >
              Password
            </Label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
  
          {/* Apple-style primary button */}
          <Button
            type="submit"
            className="w-full h-14 bg-black hover:bg-gray-800 text-white font-medium text-base rounded-xl transition-colors duration-200 shadow-sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
  
        {/* Apple-style secondary actions */}
        <div className="mt-8 space-y-2">
          <div className="text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-800 font-medium text-base transition-colors"
              disabled={loading}
            >
              Sign Up
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>

      {/* Apple-style footer */}

    </div>
  );
};

export default Login; 