import { useEffect, useMemo, useRef, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router-dom";
import showNotification from "@/utils/notifications";
import PageShell from "@/components/layout/PageShell";
import { getPasswordChecks, isStrongPassword } from "@/utils/passwordRules";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import JupiterGlobe from "@/components/planets/JupiterGlobe";
import "./styles/AuthPage.css";

const AUTH_MODE_LOGIN = "login";
const AUTH_MODE_REGISTER = "register";
const AUTH_MODES = [
  { value: AUTH_MODE_LOGIN, label: "Login" },
  { value: AUTH_MODE_REGISTER, label: "Register" },
];
const PASSWORD_RULES = [
  { key: "length", label: "8 or more characters" },
  { key: "lowercase", label: "At least one lowercase letter" },
  { key: "uppercase", label: "At least one uppercase letter" },
  { key: "number", label: "At least one number" },
  { key: "symbol", label: "At least one symbol" },
];

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

function AuthPage({ auth, isLight, onNavigate }) {
  const [mode, setMode] = useState(AUTH_MODE_LOGIN);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const actionData = useActionData();
  const navigation = useNavigation();
  const handledActionIdRef = useRef(0);

  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const isRegisterMode = mode === AUTH_MODE_REGISTER;
  const isSubmitting = navigation.state === "submitting";
  const showHero = useMemo(() => isProbablyHardwareAccelerated(), []);
  const passwordChecks = useMemo(() => getPasswordChecks(password), [password]);
  const showPasswordPopover = isRegisterMode && isPasswordFocused;
  const showConfirmPassword = isRegisterMode && password.length > 0;
  const hero = showHero ? (
    <JupiterGlobe variant="day" className="profile-page__earth-canvas" />
  ) : null;
  const authSwitcherStyle = {
    "--switch-index": isRegisterMode ? 1 : 0,
    "--switch-count": 2,
  };
  const headingText = isRegisterMode ? "Create your account" : "Welcome back";
  const supportingText = isRegisterMode
    ? "Save your profile and keep your map preferences on this device."
    : "Log in to continue to your profile and map.";
  const submitText = isRegisterMode ? "Create account" : "Log in";

  const resetPasswords = () => {
    setPassword("");
    setConfirmPassword("");
  };

  useEffect(() => {
    if (!actionData || typeof actionData !== "object") return;

    const requestId = Number(actionData.requestId);
    if (!Number.isFinite(requestId)) return;
    if (handledActionIdRef.current === requestId) return;
    handledActionIdRef.current = requestId;

    if (!actionData.ok) {
      showNotification(
        typeof actionData.error === "string" && actionData.error.trim()
          ? actionData.error.trim()
          : "Authentication failed",
        "failure",
        { duration: 3600 },
      );
      return;
    }

    if (actionData.session) {
      auth?.applySession?.(actionData.session);
    }

    if (actionData.mode === AUTH_MODE_REGISTER) {
      showNotification("Account created. You are now logged in", "success", {
        duration: 2600,
      });
    } else {
      showNotification("Welcome back!", "success", { duration: 2200 });
    }

    onNavigate?.("/");
  }, [actionData, auth, onNavigate]);

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetPasswords();
    setIsPasswordFocused(false);
  };

  const handleSubmit = (event) => {
    if (isSubmitting) {
      event.preventDefault();
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      event.preventDefault();
      showNotification("Enter a valid email address", "failure", {
        duration: 2800,
      });
      return;
    }

    if (!password) {
      event.preventDefault();
      showNotification("Enter your password", "failure", { duration: 2600 });
      return;
    }

    if (isRegisterMode && !isStrongPassword(password)) {
      event.preventDefault();
      showNotification(
        "Use a stronger password: 8+ chars with upper, lower, number, and symbol",
        "failure",
        { duration: 3600 },
      );
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      event.preventDefault();
      showNotification("Passwords do not match", "failure", { duration: 2800 });
    }
  };

  return (
    <PageShell
      title="Account"
      subtitle=""
      isLight={isLight}
      onNavigate={onNavigate}
      hero={hero}
      className="auth-page"
    >
      <section className="profile-card glass-panel glass-panel-elevated auth-card">
        {isAuthenticated ? (
          <>
            <h2 className="profile-section-title">You are signed in</h2>
            <p className="profile-section-copy">
              Continue to your profile to edit your details, or jump back to the
              map.
            </p>
            <div className="profile-actions">
              <button
                type="button"
                className="glass-btn profile-action-btn profile-secondary"
                onClick={() => onNavigate?.("/")}
              >
                Open Map
              </button>
              <button
                type="button"
                className="glass-btn profile-action-btn profile-primary"
                onClick={() => onNavigate?.("/profile")}
              >
                Edit profile
              </button>
            </div>
          </>
        ) : (
          <Form method="post" className="auth-form" onSubmit={handleSubmit} noValidate>
            <input type="hidden" name="mode" value={mode} />
            <div className="auth-headline">
              <h2 className="profile-section-title auth-title">
                {headingText}
              </h2>
              <p className="profile-section-copy">{supportingText}</p>
            </div>

            <div
              className="auth-mode-switcher"
              role="tablist"
              aria-label="Auth mode"
              style={authSwitcherStyle}
            >
              {AUTH_MODES.map((authMode) => (
                <button
                  key={authMode.value}
                  type="button"
                  className={`auth-mode-switch${
                    mode === authMode.value ? " active" : ""
                  }`}
                  role="tab"
                  aria-selected={mode === authMode.value}
                  onClick={() => handleModeChange(authMode.value)}
                >
                  {authMode.label}
                </button>
              ))}
            </div>

            <div className="auth-layout">
              <div className="profile-section auth-fields">
                {isRegisterMode ? (
                  <label className="profile-field">
                    <span className="profile-label">Display name</span>
                    <input
                      className="profile-input"
                      type="text"
                      name="name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </label>
                ) : null}
                <label className="profile-field">
                  <span className="profile-label">Email</span>
                  <input
                    className="profile-input"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="profile-field auth-field--wide">
                  <span className="profile-label">Password</span>
                  <input
                    className="profile-input"
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder="Enter password"
                    autoComplete={
                      isRegisterMode ? "new-password" : "current-password"
                    }
                    minLength={8}
                    required
                  />
                  {isRegisterMode ? (
                    <div
                      className={`auth-password-popover${
                        showPasswordPopover ? " is-visible" : ""
                      }`}
                      role="status"
                      aria-live="polite"
                      aria-hidden={!showPasswordPopover}
                    >
                      <div className="auth-password-popover__title">
                        Password requirements
                      </div>
                      <ul className="auth-password-rules">
                        {PASSWORD_RULES.map((rule) => (
                          <li
                            key={rule.key}
                            className={passwordChecks[rule.key] ? "valid" : ""}
                          >
                            {rule.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </label>
                {isRegisterMode ? (
                  <label
                    className={`profile-field auth-field--wide auth-confirm-field${
                      showConfirmPassword ? " is-visible" : ""
                    }`}
                    aria-hidden={!showConfirmPassword}
                  >
                    <span className="profile-label">Confirm password</span>
                    <input
                      className="profile-input"
                      type="password"
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      minLength={8}
                      required={showConfirmPassword}
                    />
                  </label>
                ) : null}
              </div>
            </div>

            <div className="profile-actions auth-actions">
              <button
                type="submit"
                className="glass-btn profile-action-btn profile-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Please wait..." : submitText}
              </button>
            </div>
          </Form>
        )}
      </section>
    </PageShell>
  );
}

export default AuthPage;
