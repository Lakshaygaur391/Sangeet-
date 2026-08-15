import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IoLogInOutline,
  IoPersonAddOutline,
  IoPersonOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoMusicalNotesOutline,
} from "react-icons/io5";

const AuthCard = ({ initialView = "signin" }) => {
  const [view, setView] = useState(initialView);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPw, setSiShowPw] = useState(false);

  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suShowPw, setSuShowPw] = useState(false);

  const [error, setError] = useState("");
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => setView(initialView), [initialView]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const selectView = (next) => {
    if (next === view) return;
    setError("");
    setView(next);
    navigate(next === "signin" ? "/login" : "/register", { replace: true });
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    if (!siEmail.trim() || !siPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    const result = await login(siEmail, siPassword);
    if (result.success) navigate("/");
    else setError(result.message);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!suName.trim() || !suEmail.trim() || !suPassword.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (suPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (suPassword !== suConfirm) {
      setError("Passwords do not match.");
      return;
    }
    const result = await register(suName, suEmail, suPassword);
    if (result.success) navigate("/");
    else setError(result.message);
  };

  const isSignin = view === "signin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 text-white">
      <style>{`
        @keyframes authFormIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-form-anim { animation: authFormIn 0.35s ease; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.10),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.10),_transparent_35%)]" />

      <div
        className="relative z-10 w-full rounded-[28px] border border-white/10 bg-[#0c0c0d]/95 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
        style={{
          maxWidth: isDesktop ? "700px" : "420px",
          overflow: "hidden",
          display: isDesktop ? "flex" : "block",
          minHeight: isDesktop ? "460px" : "auto",
        }}
      >
        {/* ---- SIDEBAR (icon tabs) ---- */}
        <ul
          className="relative flex flex-shrink-0 flex-col items-center gap-8 border-b border-white/10 py-6 md:border-b-0 md:border-r"
          style={{
            width: isDesktop ? "110px" : "100%",
            flexDirection: isDesktop ? "column" : "row",
            justifyContent: isDesktop ? "flex-start" : "center",
          }}
        >
          <span
            className="absolute bg-indigo-500 rounded-full"
            style={{
              transition: "all 0.4s ease-in-out",
              ...(isDesktop
                ? { width: "3px", height: "72px", right: 0, left: "auto", top: isSignin ? "88px" : "192px" }
                : { height: "3px", width: "72px", bottom: 0, top: "auto", left: isSignin ? "25%" : "60%" }),
            }}
          />

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <IoMusicalNotesOutline className="text-xl" />
          </div>

          <li>
            <button
              type="button"
              onClick={() => selectView("signin")}
              className={`flex flex-col items-center gap-1.5 text-xs font-semibold transition
                ${isSignin ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              <IoLogInOutline className="text-xl" />
              <span>Sign In</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => selectView("signup")}
              className={`flex flex-col items-center gap-1.5 text-xs font-semibold transition
                ${!isSignin ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
            >
              <IoPersonAddOutline className="text-xl" />
              <span>Sign Up</span>
            </button>
          </li>
        </ul>

        <div
          style={{
            display: "flex",
            flexDirection: isDesktop ? "row" : "column",
            flex: "1 1 0%",
            minWidth: 0,
          }}
        >
          {/* ---- HERO (full-size illustration, no duplicate text overlay) ---- */}
          <div
            className="relative m-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 overflow-hidden"
            style={{
              flexShrink: 0,
              height: isDesktop ? "auto" : "220px",
              width: isDesktop ? "38%" : "auto",
            }}
          >
            <img
              src="/signin.png"
              alt="Welcome back"
              className="absolute inset-0 h-full w-full pointer-events-none"
              style={{
                objectFit: "cover",
                transition: "opacity 0.4s ease-in-out, transform 0.4s ease-in-out",
                opacity: isSignin ? 1 : 0,
                transform: isSignin ? "translateY(0)" : "translateY(12px)",
              }}
            />
            <img
              src="/signup.png"
              alt="Sign up"
              className="absolute inset-0 h-full w-full pointer-events-none"
              style={{
                objectFit: "cover",
                transition: "opacity 0.4s ease-in-out, transform 0.4s ease-in-out",
                opacity: isSignin ? 0 : 1,
                transform: isSignin ? "translateY(-12px)" : "translateY(0)",
              }}
            />
          </div>

          {/* ---- FORM ---- */}
          <div className="relative px-6 pb-6 pt-5 md:py-6" style={{ flex: "1 1 0%", minWidth: 0 }}>
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-center text-xs font-medium text-red-400">
                {error}
              </div>
            )}

            {isSignin ? (
              <form key="signin" onSubmit={handleSignIn} className="auth-form-anim space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">Email</label>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={siEmail}
                      onChange={(e) => setSiEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#161618] py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <IoMailOutline className="pointer-events-none absolute right-3.5 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={siShowPw ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#161618] py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setSiShowPw(!siShowPw)}
                      className="absolute right-3.5 text-gray-400 hover:text-white"
                    >
                      {siShowPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-gray-500">
                  By clicking Sign In you agree to our{" "}
                  <a href="/terms" className="font-medium text-indigo-400 hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="font-medium text-indigo-400 hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form key="signup" onSubmit={handleSignUp} className="auth-form-anim space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">Full Name</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={suName}
                      onChange={(e) => setSuName(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#161618] py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <IoPersonOutline className="pointer-events-none absolute right-3.5 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">Email</label>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#161618] py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <IoMailOutline className="pointer-events-none absolute right-3.5 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={suShowPw ? "text" : "password"}
                      required
                      placeholder="At least 6 characters"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#161618] py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setSuShowPw(!suShowPw)}
                      className="absolute right-3.5 text-gray-400 hover:text-white"
                    >
                      {suShowPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">Confirm Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={suShowPw ? "text" : "password"}
                      required
                      placeholder="Re-enter password"
                      value={suConfirm}
                      onChange={(e) => setSuConfirm(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#161618] py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <IoLockClosedOutline className="pointer-events-none absolute right-3.5 text-gray-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Sign Up"}
                </button>
                  <p className="text-[11px] leading-relaxed text-gray-500">
                  By clicking Sign In you agree to our{" "}
                  <a href="/terms" className="font-medium text-indigo-400 hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="font-medium text-indigo-400 hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>

              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCard;