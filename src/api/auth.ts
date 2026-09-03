import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器，自动添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器，处理token过期等情况
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 可以在这里处理401错误，例如刷新token或重定向到登录页
    return Promise.reject(error);
  }
);

// 认证相关的API
export const authAPI = {
  // 登录
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // 注册
  register: async (userData: {
    email: string;
    password: string;
    name: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // 获取当前用户信息
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // 刷新token
  refreshToken: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // 登出（客户端操作）
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

// 用户相关的API
export const userAPI = {
  // 获取用户列表
  getUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // 创建用户
  createUser: async (userData: any) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // 更新用户
  updateUser: async (id: string, userData: any) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // 删除用户
  deleteUser: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

// JWT token解码工具
export const decodeToken = (token: string) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

// 检查token是否过期
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  return Date.now() >= decoded.exp * 1000;
};

// 获取有效的access token
export const getAccessToken = (): string | null => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  if (isTokenExpired(token)) {
    // 这里可以添加刷新token的逻辑
    // 为了简单起见，我们直接返回null，让调用者处理过期情况
    return null;
  }

  return token;
};