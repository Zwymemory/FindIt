import { request } from './request';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatar: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register(payload: RegisterPayload) {
    return request.post<unknown, AuthUser>('/auth/register', payload);
  },

  login(payload: LoginPayload) {
    return request.post<unknown, LoginResult>('/auth/login', payload);
  },

  profile() {
    return request.get<unknown, AuthUser>('/auth/profile');
  },
};
