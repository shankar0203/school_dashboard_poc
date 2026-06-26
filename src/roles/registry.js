// Maps each role to its navigation + screen components.
import { studentNav } from "./student.jsx";
import { teacherNav } from "./teacher.jsx";
import { principalNav } from "./principal.jsx";

export const NAV = {
  student: studentNav,
  teacher: teacherNav,
  principal: principalNav,
};
