import type { User } from "firebase/auth";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupInput extends AuthCredentials {
  confirmPassword: string;
}

export interface AuthResult {
  user: User;
}

export interface ServiceError {
  code: string;
  message: string;
}
