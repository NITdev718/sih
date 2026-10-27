export const ROLE_HOME = {
  institution: '/institution',
  student: '/student',
  verifier: '/verify',
  admin: '/admin',
};

export const ROLE_LABEL = {
  institution: 'Institution',
  student: 'Student',
  verifier: 'Verifier',
  admin: 'Admin',
};

// Which roles may open which page prefix (used by middleware).
export const PAGE_ROLES = {
  '/institution': ['institution', 'admin'],
  '/student': ['student'],
  '/verify': ['verifier'],
  '/admin': ['admin'],
};

export const FIELD_LABEL = {
  name: 'Full name',
  dob: 'Date of birth',
  gender: 'Gender',
  institution: 'Institution',
  course: 'Course',
  year: 'Year of study',
  status: 'Enrolment status',
};

export const DEMO_PASSWORD = 'Demo@1234';

export const DEMO_LOGINS = {
  institution: 'institution@apaar.test',
  student: 'student@apaar.test',
  verifier: 'verifier@apaar.test',
  admin: 'admin@apaar.test',
};
