// ==========================================
// AUTH MODELS
// ==========================================

export interface LoginRequest {
  username: string;
  password: string;
  clubCode: string;
  rememberMe: boolean;
}

export interface CheckMobileRequest {
  mobileNumber: string;
}

export interface CheckMobileResponse {
  success: boolean;
  message: string;
  fullName?: string;
  mobileNumber?: string;
  isMasterAdmin: boolean;
  clubs: UserClub[];
}

export interface UserClub {
  clubId: number;
  clubCode: string;
  clubNameEn: string;
  clubNameAr: string;
  roleName: string;
  roleDisplayName: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  isClubInactive?: boolean;
  token?: TokenInfo;
  userInfo?: UserInfo;
}

export interface TokenInfo {
  accessToken: string;
  expiresAt: string;
  tokenType: string;
}

export interface UserInfo {
  userId: number;
  clubId?: number;
  fullName: string;
  mobileNumber: string;
  email?: string;
  roleName: string;
  isMasterAdmin: boolean;
  clubCode?: string;
  clubNameEn?: string;
  clubNameAr?: string;
  theme?: ThemeInfo;
  permissions: string[];
  clubs?: UserClub[]; // User's accessible clubs
}

export interface ThemeInfo {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoBase64?: string;
  logoContentType?: string;
  hasLogo: boolean;
}

// ==========================================
// CLUB MODELS
// ==========================================

export interface CreateClubRequest {
  clubNameEn: string;
  clubNameAr: string;
  clubCode: string;
  cityId: number;
  locationCoordinates?: string;
  locationUrl?: string;
  baseCurrency: string;
  autoDeactivateDays: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoBase64?: string;
  logoContentType?: string;
  logoFileName?: string;
  adminFullName: string;
  adminMobileNumber: string;
  adminEmail?: string;
}

export interface ClubDetailsResponse {
  clubId: number;
  clubNameEn: string;
  clubNameAr: string;
  clubCode: string;
  cityId?: number;
  cityNameEn?: string;
  cityNameAr?: string;
  stateNameEn?: string;
  stateNameAr?: string;
  locationCoordinates?: string;
  locationUrl?: string;
  baseCurrency: string;
  isActive: boolean;
  autoDeactivateDays: number;
  createdOn: string;
  theme?: ThemeDetails;
  totalRoles: number;
  totalUsers: number;
}

export interface ThemeDetails {
  themeId: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  hasLogo: boolean;
  logoFileName?: string;
  logoFileSize?: number;
}

export interface CreateClubResponse {
  success: boolean;
  message: string;
  club?: ClubDetailsResponse;
  adminCredentials?: AdminCredentials;
}

export interface AdminCredentials {
  username: string;
  temporaryPassword: string;
  message: string;
}

// ==========================================
// STUDENT & PARENT MODELS
// ==========================================

export interface RegisterParentStudentRequest {
  mobileNumber: string;
  parentFullName: string;
  parentEmail?: string;
  students: StudentRegistration[];
}

export interface StudentRegistration {
  fullName: string;
  dateOfBirth: string; // ISO date string
  gender: 'Male' | 'Female';
  medicalNotes?: string;
  photoBase64?: string;
  photoContentType?: string;
  photoFileName?: string;
  isSelfRegistered?: boolean;
}

export interface RegisterParentStudentResponse {
  success: boolean;
  message: string;
  parentId?: number;
  studentIds: number[];
  parentAlreadyExists: boolean;
  userAccountCreated: boolean;
  temporaryPassword?: string;
}

export interface CheckParentRequest {
  mobileNumber: string;
}

export interface CheckParentResponse {
  success: boolean;
  message: string;
  parentExists: boolean;
  parentId?: number;
  parentFullName?: string;
  parentEmail?: string;
  existingStudents: ExistingStudent[];
}

export interface ExistingStudent {
  studentId: number;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  hasPhoto: boolean;
  isSelfRegistered: boolean;
}

export interface StudentListItem {
  studentId: number;
  fullName: string;
  age: number;
  gender: string;
  hasPhoto: boolean;
  isSelfRegistered: boolean;
  parentFullName: string;
  parentMobile: string;
  isActive: boolean;
}

export interface StudentDetails {
  studentId: number;
  parentId: number;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  medicalNotes?: string;
  hasPhoto: boolean;
  isSelfRegistered: boolean;
  photoFileName?: string;
  photoFileSize?: number;
  isActive: boolean;
  createdOn: string;
  parentFullName: string;
  parentMobile: string;
  parentEmail?: string;
}

export interface UpdateStudentRequest {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  medicalNotes?: string;
  photoBase64?: string;
  photoContentType?: string;
  photoFileName?: string;
  removePhoto?: boolean;
}

export interface UpdateStudentResponse {
  success: boolean;
  message: string;
  studentId: number;
}

// ==========================================
// COMMON MODELS
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
