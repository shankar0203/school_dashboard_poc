import { createContext, useContext } from "react";

// { role, setRole, view, setView, bump }  — bump() forces a re-render after
// an in-memory data mutation (posting a message, adding a student, etc.)
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
