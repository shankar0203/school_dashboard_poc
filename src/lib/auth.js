// Cognito auth — the ONE place that talks to AWS Cognito.
// Uses amazon-cognito-identity-js (SRP flow, no client secret).
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import config from "../config/appConfig.js";

const pool = new CognitoUserPool({
  UserPoolId: config.cognito.userPoolId,
  ClientId: config.cognito.clientId,
});

// Highest privilege wins (order matters)
const ROLE_PRECEDENCE = ["owner", "principal", "schoolAdmin", "teacher", "parent", "student", "guest"];

const GROUP_TO_ROLE = {
  // short names
  "owner":              "owner",
  "principal":          "principal",
  "schoolAdmin":        "schoolAdmin",
  "school-admin":       "schoolAdmin",
  "teacher":            "teacher",
  "parent":             "parent",
  "student":            "student",
  "guest":              "guest",
  // vidyam-prefixed names (Cognito groups from CFT)
  "vidyam-leadership":   "owner",
  "vidyam-principal":    "principal",
  "vidyam-school-admin": "schoolAdmin",
  "vidyam-teacher":      "teacher",
  "vidyam-parent":       "parent",
  "vidyam-student":      "student",
  "vidyam-guest":        "guest",
};

export function roleFromGroups(groups = []) {
  const roles = groups.map((g) => GROUP_TO_ROLE[g]).filter(Boolean);
  return ROLE_PRECEDENCE.find((r) => roles.includes(r)) || null;
}

function sessionToUser(session) {
  const payload = session.getIdToken().decodePayload();
  const groups = payload["cognito:groups"] || [];
  return {
    email: payload.email || payload["cognito:username"] || "",
    groups,
    role: roleFromGroups(groups),
  };
}

// resolve the current signed-in user (or null) on app load
export function getCurrentUser() {
  return new Promise((resolve) => {
    const u = pool.getCurrentUser();
    if (!u) return resolve(null);
    u.getSession((err, session) => {
      if (err || !session || !session.isValid()) return resolve(null);
      resolve(sessionToUser(session));
    });
  });
}

// sign in. Returns {kind:"ok", user} or {kind:"newPassword", cognitoUser}
export function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    const details = new AuthenticationDetails({ Username: email, Password: password });
    cognitoUser.authenticateUser(details, {
      onSuccess: (session) => resolve({ kind: "ok", user: sessionToUser(session) }),
      onFailure: (err) => reject(err),
      newPasswordRequired: () => resolve({ kind: "newPassword", cognitoUser }),
    });
  });
}

// first-login: admin-created users must set a permanent password
export function completeNewPassword(cognitoUser, newPassword) {
  return new Promise((resolve, reject) => {
    cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: (session) => resolve(sessionToUser(session)),
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut() {
  const u = pool.getCurrentUser();
  if (u) u.signOut();
}
