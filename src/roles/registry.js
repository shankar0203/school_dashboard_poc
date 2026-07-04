// Maps each role to its navigation + screen components.
import { studentNav }     from "./student.jsx";
import { teacherNav }     from "./teacher.jsx";
import { principalNav }   from "./principal.jsx";
import { parentNav }      from "./parent.jsx";
import { schoolAdminNav } from "./schoolAdmin.jsx";
import { ownerNav }       from "./owner.jsx";

export const NAV = {
  student:     studentNav,
  teacher:     teacherNav,
  principal:   principalNav,
  parent:      parentNav,
  schoolAdmin: schoolAdminNav,
  owner:       ownerNav,
};
