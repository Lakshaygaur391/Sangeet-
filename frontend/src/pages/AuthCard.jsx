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

  // =========================
  // SIGN IN STATES
  // =========================
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPw, setSiShowPw] = useState(false);

  // =========================
  // SIGN UP STATES
  // =========================
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suShowPw, setSuShowPw] = useState(false);

  const [error, setError] = useState("");

  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  // =====================================================
  // EMAIL REGEX
  // =====================================================
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // =====================================================
  // MAIN ACCENT COLOR
  // Screenshot login button color
  // =====================================================
  const accentColor = "#FFB900";
  const accentHover = "#E6A600";

  // =====================================================
  // VIEW CHANGE
  // =====================================================
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  // =====================================================
  // RESPONSIVE
  // =====================================================
  useEffect(() => {
    const onResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // =====================================================
  // SELECT SIGN IN / SIGN UP
  // =====================================================
  const selectView = (next) => {
    if (next === view) return;

    setError("");
    setView(next);

    navigate(next === "signin" ? "/login" : "/register", {
      replace: true,
    });
  };

  // =====================================================
  // EMAIL VALIDATION
  // =====================================================
  const validateEmail = (email) => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      return "Email is required.";
    }

    if (!emailRegex.test(cleanEmail)) {
      return "Please enter a valid email address.";
    }

    return "";
  };

  // =====================================================
  // SIGN IN
  // =====================================================
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");

    const email = siEmail.trim();

    // Empty fields
    if (!email || !siPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    // Email validation
    const emailError = validateEmail(email);

    if (emailError) {
      setError(emailError);
      return;
    }

    // Login
    const result = await login(
      email.toLowerCase(),
      siPassword
    );

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message);
    }
  };

  // =====================================================
  // SIGN UP
  // =====================================================
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    const name = suName.trim();
    const email = suEmail.trim();

    // Required fields
    if (!name || !email || !suPassword || !suConfirm) {
      setError("Please fill in all required fields.");
      return;
    }

    // Email validation
    const emailError = validateEmail(email);

    if (emailError) {
      setError(emailError);
      return;
    }

    // Password length
    if (suPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Password match
    if (suPassword !== suConfirm) {
      setError("Passwords do not match.");
      return;
    }

    // Register
    const result = await register(
      name,
      email.toLowerCase(),
      suPassword
    );

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message);
    }
  };

  const isSignin = view === "signin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-12 text-white">
      <style>{`
        @keyframes authFormIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-form-anim {
          animation: authFormIn 0.35s ease;
        }

        .auth-input:focus {
          border-color: rgba(255, 185, 0, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(255, 185, 0, 0.12);
          outline: none;
        }

        .auth-link {
          color: #FFB900;
        }

        .auth-link:hover {
          color: #FFD166;
        }

        .auth-button {
          background: #FFB900;
          color: #050505;
        }

        .auth-button:hover {
          background: #E6A600;
        }

        .auth-button:disabled {
          opacity: 0.5;
        }
      `}</style>

      {/* ==========================================
          BACKGROUND
      ========================================== */}
      <div
        className="
          pointer-events-none
          fixed
          inset-0
          bg-[radial-gradient(circle_at_top_left,_rgba(255,185,0,0.08),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(255,185,0,0.06),_transparent_35%)]
        "
      />

      {/* ==========================================
          MAIN CARD
      ========================================== */}
      <div
        className="
          relative
          z-10
          w-full
          rounded-[28px]
          border
          border-white/10
          bg-[#0c0c0d]/95
          shadow-[0_30px_80px_rgba(0,0,0,0.7)]
          backdrop-blur-2xl
        "
        style={{
          maxWidth: isDesktop ? "700px" : "420px",
          overflow: "hidden",
          display: isDesktop ? "flex" : "block",
          minHeight: isDesktop ? "460px" : "auto",
        }}
      >
        {/* ==========================================
            SIDEBAR
        ========================================== */}
        <ul
          className="
            relative
            flex
            flex-shrink-0
            flex-col
            items-center
            gap-8
            border-b
            border-white/10
            py-6
            md:border-b-0
            md:border-r
          "
          style={{
            width: isDesktop ? "110px" : "100%",
            flexDirection: isDesktop ? "column" : "row",
            justifyContent: isDesktop ? "flex-start" : "center",
          }}
        >
          {/* Active Indicator */}
          <span
            className="absolute rounded-full"
            style={{
              backgroundColor: accentColor,
              transition: "all 0.4s ease-in-out",

              ...(isDesktop
                ? {
                  width: "3px",
                  height: "72px",
                  right: 0,
                  left: "auto",
                  top: isSignin ? "88px" : "192px",
                }
                : {
                  height: "3px",
                  width: "72px",
                  bottom: 0,
                  top: "auto",
                  left: isSignin ? "25%" : "60%",
                }),
            }}
          />

          {/* ========================================
              LOGO
          ======================================== */}
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-2xl
              text-black
            "
            style={{
              backgroundColor: accentColor,
            }}
          >
            <IoMusicalNotesOutline className="text-xl" />
          </div>

          {/* ========================================
              SIGN IN
          ======================================== */}
          <li>
            <button
              type="button"
              onClick={() => selectView("signin")}
              className={`
                flex
                flex-col
                items-center
                gap-1.5
                text-xs
                font-semibold
                transition
                ${isSignin
                  ? "text-[#FFB900]"
                  : "text-gray-500 hover:text-gray-300"
                }
              `}
            >
              <IoLogInOutline className="text-xl" />
              <span>Sign In</span>
            </button>
          </li>

          {/* ========================================
              SIGN UP
          ======================================== */}
          <li>
            <button
              type="button"
              onClick={() => selectView("signup")}
              className={`
                flex
                flex-col
                items-center
                gap-1.5
                text-xs
                font-semibold
                transition
                ${!isSignin
                  ? "text-[#FFB900]"
                  : "text-gray-500 hover:text-gray-300"
                }
              `}
            >
              <IoPersonAddOutline className="text-xl" />
              <span>Sign Up</span>
            </button>
          </li>
        </ul>

        {/* ==========================================
            CONTENT
        ========================================== */}
        <div
          style={{
            display: "flex",
            flexDirection: isDesktop ? "row" : "column",
            flex: "1 1 0%",
            minWidth: 0,
          }}
        >
          {/* ========================================
              HERO
              Original image colors preserved
          ======================================== */}
          <div
            className="
              relative
              m-3
              overflow-hidden
              rounded-2xl
              bg-gradient-to-br
              from-indigo-600
              to-violet-700
            "
            style={{
              flexShrink: 0,
              height: isDesktop ? "auto" : "220px",
              width: isDesktop ? "38%" : "auto",
            }}
          >
            {/* Sign In Image */}
            <img
              src="/signin.png"
              alt="Welcome back"
              className="
                pointer-events-none
                absolute
                inset-0
                h-full
                w-full
              "
              style={{
                objectFit: "cover",
                transition:
                  "opacity 0.4s ease-in-out, transform 0.4s ease-in-out",
                opacity: isSignin ? 1 : 0,
                transform: isSignin
                  ? "translateY(0)"
                  : "translateY(12px)",
              }}
            />

            {/* Sign Up Image */}
            <img
              src="/signup.png"
              alt="Sign up"
              className="
                pointer-events-none
                absolute
                inset-0
                h-full
                w-full
              "
              style={{
                objectFit: "cover",
                transition:
                  "opacity 0.4s ease-in-out, transform 0.4s ease-in-out",
                opacity: isSignin ? 0 : 1,
                transform: isSignin
                  ? "translateY(-12px)"
                  : "translateY(0)",
              }}
            />
          </div>

          {/* ========================================
              FORM
          ======================================== */}
          <div
            className="
              relative
              px-6
              pb-6
              pt-5
              md:py-6
            "
            style={{
              flex: "1 1 0%",
              minWidth: 0,
            }}
          >
            {/* ======================================
                ERROR MESSAGE
            ====================================== */}
            {error && (
              <div
                className="
                  mb-3
                  rounded-xl
                  border
                  border-red-500/30
                  bg-red-500/10
                  p-2.5
                  text-center
                  text-xs
                  font-medium
                  text-red-400
                "
              >
                {error}
              </div>
            )}

            {/* ======================================
                SIGN IN FORM
            ====================================== */}
            {isSignin ? (
              <form
                key="signin"
                onSubmit={handleSignIn}
                className="auth-form-anim space-y-3.5"
              >
                {/* EMAIL */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Email
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={siEmail}
                      onChange={(e) =>
                        setSiEmail(e.target.value)
                      }
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                      title="Please enter a valid email address"
                      className="
                        auth-input
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#161618]
                        py-2.5
                        pl-4
                        pr-10
                        text-sm
                        text-white
                        placeholder:text-gray-500
                        transition
                      "
                    />

                    <IoMailOutline
                      className="
                        pointer-events-none
                        absolute
                        right-3.5
                        text-gray-400
                      "
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Password
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type={
                        siShowPw ? "text" : "password"
                      }
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={siPassword}
                      onChange={(e) =>
                        setSiPassword(e.target.value)
                      }
                      className="
                        auth-input
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#161618]
                        py-2.5
                        pl-4
                        pr-10
                        text-sm
                        text-white
                        placeholder:text-gray-500
                        transition
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setSiShowPw(!siShowPw)
                      }
                      className="
                        absolute
                        right-3.5
                        text-gray-400
                        transition
                        hover:text-white
                      "
                      aria-label={
                        siShowPw
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {siShowPw ? (
                        <IoEyeOffOutline />
                      ) : (
                        <IoEyeOutline />
                      )}
                    </button>
                  </div>
                </div>

                {/* TERMS */}
                <p
                  className="
                    text-[11px]
                    leading-relaxed
                    text-gray-500
                  "
                >
                  By clicking Sign In you agree to our{" "}
                  <a
                    href="/terms"
                    className="auth-link font-medium hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    className="auth-link font-medium hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>

                {/* SIGN IN BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    auth-button
                    w-full
                    rounded-xl
                    py-3
                    text-sm
                    font-bold
                    shadow-lg
                    transition
                    active:scale-[0.99]
                  "
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            ) : (
              /* ====================================
                 SIGN UP FORM
              ==================================== */
              <form
                key="signup"
                onSubmit={handleSignUp}
                className="auth-form-anim space-y-3"
              >
                {/* FULL NAME */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Full Name
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Your name"
                      value={suName}
                      onChange={(e) =>
                        setSuName(e.target.value)
                      }
                      className="
                        auth-input
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#161618]
                        py-2.5
                        pl-4
                        pr-10
                        text-sm
                        text-white
                        placeholder:text-gray-500
                        transition
                      "
                    />

                    <IoPersonOutline
                      className="
                        pointer-events-none
                        absolute
                        right-3.5
                        text-gray-400
                      "
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Email
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Enter your email"
                      value={suEmail}
                      onChange={(e) =>
                        setSuEmail(e.target.value)
                      }
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                      title="Please enter a valid email address"
                      className="
                        auth-input
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#161618]
                        py-2.5
                        pl-4
                        pr-10
                        text-sm
                        text-white
                        placeholder:text-gray-500
                        transition
                      "
                    />

                    <IoMailOutline
                      className="
                        pointer-events-none
                        absolute
                        right-3.5
                        text-gray-400
                      "
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Password
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type={
                        suShowPw ? "text" : "password"
                      }
                      required
                      autoComplete="new-password"
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={suPassword}
                      onChange={(e) =>
                        setSuPassword(e.target.value)
                      }
                      className="
                        auth-input
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#161618]
                        py-2.5
                        pl-4
                        pr-10
                        text-sm
                        text-white
                        placeholder:text-gray-500
                        transition
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setSuShowPw(!suShowPw)
                      }
                      className="
                        absolute
                        right-3.5
                        text-gray-400
                        transition
                        hover:text-white
                      "
                      aria-label={
                        suShowPw
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {suShowPw ? (
                        <IoEyeOffOutline />
                      ) : (
                        <IoEyeOutline />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-300">
                    Confirm Password
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type={
                        suShowPw ? "text" : "password"
                      }
                      required
                      autoComplete="new-password"
                      minLength={6}
                      placeholder="Re-enter password"
                      value={suConfirm}
                      onChange={(e) =>
                        setSuConfirm(e.target.value)
                      }
                      className="
                        auth-input
                        w-full
                        rounded-xl
                        border
                        border-white/10
                        bg-[#161618]
                        py-2.5
                        pl-4
                        pr-10
                        text-sm
                        text-white
                        placeholder:text-gray-500
                        transition
                      "
                    />

                    <IoLockClosedOutline
                      className="
                        pointer-events-none
                        absolute
                        right-3.5
                        text-gray-400
                      "
                    />
                  </div>
                </div>

                {/* SIGN UP BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    auth-button
                    w-full
                    rounded-xl
                    py-3
                    text-sm
                    font-bold
                    shadow-lg
                    transition
                    active:scale-[0.99]
                  "
                >
                  {loading
                    ? "Creating Account..."
                    : "Sign Up"}
                </button>

                {/* TERMS */}
                <p
                  className="
                    text-[11px]
                    leading-relaxed
                    text-gray-500
                  "
                >
                  By clicking Sign Up you agree to our{" "}
                  <a
                    href="/terms"
                    className="auth-link font-medium hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    className="auth-link font-medium hover:underline"
                  >
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