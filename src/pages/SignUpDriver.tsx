import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, User, Phone, Truck, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { validatePassword } from "../lib/validation";

export function SignUpDriver() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    vehicleType: "",
    licenseNumber: "",
    radius: "50",
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      const normalizedEmail = formData.email.toLowerCase().trim();

      await api.auth.register(normalizedEmail, formData.password, "driver");

      await api.drivers.create({
        name: formData.name,
        email: normalizedEmail,
        phone: formData.phone,
        vehicleType: formData.vehicleType,
        licenseNumber: formData.licenseNumber || null,
        radius: parseInt(formData.radius),
      });

      await refreshAuth();

      showToast("Account created successfully!", "success");
      navigate("/driver");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      if (message.includes("already exists")) {
        showToast("An account with this email already exists. Please log in instead.", "error");
      } else {
        showToast(message, "error");
      }
      console.error("Driver signup error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-gray-600 hover:text-black mb-6 transition"
          data-testid="button-back"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Home
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Driver Sign Up</h1>
            <p className="text-gray-600">
              Create your driver profile to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <User size={16} />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  data-testid="input-name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Mail size={16} />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Phone size={16} />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Truck size={16} />
                    <span>Vehicle Type</span>
                  </label>
                  <select
                    required
                    value={formData.vehicleType}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicleType: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="select-vehicle-type"
                  >
                    <option value="">Select vehicle type</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="van">Van</option>
                    <option value="flatbed">Flatbed</option>
                    <option value="enclosed">Enclosed Trailer</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <MapPin size={16} />
                    <span>Service Radius (miles)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="500"
                    value={formData.radius}
                    onChange={(e) =>
                      setFormData({ ...formData, radius: e.target.value })
                    }
                    placeholder="50"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="input-radius"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <span>Driver's License Number (optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, licenseNumber: e.target.value })
                  }
                  placeholder="DL12345678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  data-testid="input-license"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Lock size={16} />
                    <span>Create Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    At least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Lock size={16} />
                    <span>Confirm Password</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600">
                  By signing up, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => window.open('/terms-of-service', '_blank')}
                    className="text-red-600 hover:text-red-700 font-semibold underline"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={() => window.open('/privacy-policy', '_blank')}
                    className="text-red-600 hover:text-red-700 font-semibold underline"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-submit"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login?type=driver")}
                    className="text-red-600 hover:text-red-700 font-semibold underline"
                    data-testid="link-login"
                  >
                    Log In Here
                  </button>
                </p>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
}
