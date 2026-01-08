import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';

export function ResetPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Password Reset</h2>
          <p className="text-gray-600 mb-4">
            Token-based password reset is not yet available.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you need to change your password, please log in to your account and update it from your profile settings. 
            If you cannot log in, please contact support for assistance.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Go to Login
          </button>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Try Password Recovery
          </button>
        </div>
      </div>
    </div>
  );
}
