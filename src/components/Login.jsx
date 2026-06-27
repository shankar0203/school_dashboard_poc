import React, { useState } from "react";
import config from "../config/appConfig.js";
import { signIn, completeNewPassword } from "../lib/auth.js";

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [challenge, setChallenge] = useState(null); // CognitoUser when new password required
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const doSignIn = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await signIn(email.trim(), password);
      if (res.kind === "newPassword") setChallenge(res.cognitoUser);
      else onSignedIn(res.user);
    } catch (e2) {
      setErr(e2.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const doNewPassword = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const user = await completeNewPassword(challenge, newPwd);
      onSignedIn(user);
    } catch (e2) {
      setErr(e2.message || "Could not set password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo">{config.app.logoInitial}</div>
          <div>
            <div className="login-name">{config.app.name}</div>
            <div className="login-tag">{config.app.tagline}</div>
          </div>
        </div>

        {!challenge ? (
          <form onSubmit={doSignIn}>
            <label>Email</label>
            <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required />
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
            {err && <div className="login-err">{err}</div>}
            <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        ) : (
          <form onSubmit={doNewPassword}>
            <div className="mini" style={{ marginBottom: 10 }}>First login — set a new password.</div>
            <label>New password</label>
            <input type="password" autoFocus value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="New password (8+ chars)" required />
            {err && <div className="login-err">{err}</div>}
            <button className="btn" disabled={busy}>{busy ? "Saving…" : "Set password & sign in"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
