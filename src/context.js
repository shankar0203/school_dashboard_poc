import { createContext, useContext } from "react";

// { role, view, setView, bump, user, signOut }
//   role    — derived from the signed-in user's Cognito group
//   bump()  — forces a re-render after an in-memory data mutation
//   user    — { email, groups, role } from the Cognito token
//   signOut — ends the session
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
