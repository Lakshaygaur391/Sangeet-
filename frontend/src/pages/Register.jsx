import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IoPersonOutline, IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const result = await register(name, email, password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 text-white">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#0c0c0d]/90 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.12),_transparent_35%)]" />

        <div className="relative z-10">
          <div className="mb-8 text-center">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.45em] text-white/50">Studio</span>
            <h1 className="mt-1 text-3xl font-black tracking-[0.2em] text-white md:text-4xl">SANGEET</h1>
            <p className="mt-2 text-sm text-gray-400">Create your free account to get started</p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-center text-xs font-medium text-red-400 backdrop-blur-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-300">
                Full Name
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-4 text-lg text-gray-400">
                  <IoPersonOutline />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#161618] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 transition focus:border-amber-500/60 focus:bg-[#1a1a1c] focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-300">
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-4 text-lg text-gray-400">
                  <IoMailOutline />
                </div>
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#161618] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 transition focus:border-amber-500/60 focus:bg-[#1a1a1c] focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-300">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-4 text-lg text-gray-400">
                  <IoLockClosedOutline />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#161618] py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-gray-500 transition focus:border-amber-500/60 focus:bg-[#1a1a1c] focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-lg text-gray-400 transition hover:text-white"
                >
                  {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-300">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-4 text-lg text-gray-400">
                  <IoLockClosedOutline />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#161618] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 transition focus:border-amber-500/60 focus:bg-[#1a1a1c] focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-500/20 transition duration-300 hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/30 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-amber-400 transition hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
