/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  Plus,
  MapPin,
  Calendar,
  Clock,
  User,
  Check,
  Bell,
  RefreshCw,
  Layers,
  Sliders,
  ChevronRight,
  X,
  Heart,
  Trash2,
  Camera,
  Compass,
  FileText,
  Key,
  Globe,
  Cpu,
  BatteryCharging,
  CreditCard,
  HardDrive,
  Gem,
  CheckSquare,
  History,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Upload,
  LogOut
} from 'lucide-react';
import { Item, LocationRecord } from './types';
import { CATEGORY_SYSTEM, INITIAL_ITEMS as SEED_ITEMS, PRODUCT_SPEC_SECTIONS as SECTIONS_DATA } from './data';
import {
  ApiError,
  authApi,
  categoryApi,
  clearStoredToken,
  getStoredToken,
  itemApi,
  setStoredToken,
  type AuthUser,
  type CategoryDTO,
  type ItemSummaryDTO,
  type LoginPayload,
  type RegisterPayload,
} from './api';

const SIMULATED_SCENE_POOL = [
  'https://images.unsplash.com/photo-1596079890744-c1a0462d0975?auto=format&fit=crop&w=600&q=80', // Wood cabinet drawer
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80', // Backpack Compartment
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80', // Storage box holder
  'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80', // Closet drawer tray
  'https://images.unsplash.com/photo-1627914078864-16aeca4df92f?auto=format&fit=crop&w=600&q=80', // Small lockbox safe
  'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80', // Entrance wood dish tray
  'https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=600&q=80', // Dehumidifier camera storage box
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', // Travel sleeve compartment
  'https://images.unsplash.com/photo-1590283653385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80', // Leather wallet protector
  'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=600&q=80', // Tech studio wood desk
];

const mapPhotoToCategory = (photo: string): string => {
  switch (photo) {
    case 'id-card':
    case 'passport':
    case 'wallet':
      return 'documents';
    case 'battery':
    case 'sd-card':
    case 'camera':
      return 'photography';
    case 'harddrive':
      return 'electronics';
    case 'key':
      return 'keys';
    case 'briefcase':
      return 'files';
    case 'package':
      return 'valuables';
    default:
      if (['documents', 'photography', 'electronics', 'keys', 'files', 'valuables', 'others'].includes(photo)) {
        return photo;
      }
      return 'others';
  }
};

const getDefaultPhotoForIcon = (iconId: string) => {
  const cat = mapPhotoToCategory(iconId);
  switch (cat) {
    case 'documents':
      return 'https://images.unsplash.com/photo-1596079890744-c1a0462d0975?auto=format&fit=crop&w=600&q=80';
    case 'photography':
      return 'https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=600&q=80';
    case 'electronics':
      return 'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=600&q=80';
    case 'keys':
      return 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80';
    case 'files':
      return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80';
    case 'valuables':
      return 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80';
    case 'others':
    default:
      return 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80';
  }
};

const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8080';

const backendCategoryToPrototypeCategory = (code?: string) => {
  switch (code) {
    case 'document':
      return 'documents';
    case 'camera':
      return 'photography';
    case 'electronics':
      return 'electronics';
    case 'key':
      return 'keys';
    case 'file':
      return 'files';
    case 'valuable':
      return 'valuables';
    case 'other':
    default:
      return 'others';
  }
};

const resolveImageURL = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return `${BACKEND_ORIGIN}${url}`;
  return url;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '暂未核对';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂未核对';

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface PhotoDraft {
  src: string;
  file?: File;
}

interface AuthScreenProps {
  mode: 'login' | 'register';
  error: string | null;
  isLoading: boolean;
  onModeChange: (mode: 'login' | 'register') => void;
  onLogin: (payload: LoginPayload) => Promise<void>;
  onRegister: (payload: RegisterPayload) => Promise<void>;
}

interface MainAppProps {
  currentUser: AuthUser;
  onLogout: () => void;
}

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.message === 'email already exists') return '这个邮箱已经注册过了';
    if (error.message === 'username already exists') return '这个用户名已经被占用了';
    if (error.message === 'invalid email or password') return '邮箱或密码不正确';
    if (error.message === 'network error') return '网络连接失败，请确认后端服务已启动';
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '请求失败，请稍后重试';
};

function AuthScreen({ mode, error, isLoading, onModeChange, onLogin, onRegister }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await onRegister({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      return;
    }

    await onLogin({
      email: email.trim(),
      password,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-zinc-200 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-linear-to-tr from-slate-900 to-slate-800 p-2.5 rounded-2xl shadow-md ring-1 ring-slate-950/5 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
              <path d="M9 11a2 2 0 1 1 4 0" />
              <path d="m14 14 3.5-1.5M16 13l2.5 2.5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-extrabold text-xl tracking-tight text-slate-900">我东西呢？</h1>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">FindIt</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Where's My Stuff? — 忘了放哪？点开即找。</p>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <section className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm shadow-slate-200/40">
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs uppercase tracking-widest font-extrabold mb-3.5">
              <Sparkles className="w-4 h-4" />
              <span>FindIt Account</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-3">把位置记忆装进口袋</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              登录后进入现有 iPhone 仿真界面。当前阶段只接入账号能力，物品、分类、历史页面仍保留 mock 数据用于后续联调。
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: 'JWT', icon: ShieldCheck },
                { label: 'Mock UI', icon: Layers },
                { label: 'Local API', icon: Compass },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                    <Icon className="w-4 h-4 text-indigo-600 mx-auto mb-1.5" />
                    <span className="text-[10px] font-black text-slate-600">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm shadow-slate-200/50">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50 mb-5">
            <button
              type="button"
              onClick={() => onModeChange('login')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${!isRegister ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => onModeChange('register')}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${isRegister ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'}`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">用户名</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="给你的保险箱起个名字"
                    className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">邮箱</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">密码</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="请输入密码"
                  className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold px-3 py-2 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl text-sm font-black shadow-md shadow-indigo-600/25 transition-colors flex items-center justify-center gap-2"
            >
              <span>{isLoading ? '处理中...' : isRegister ? '注册并进入' : '登录并进入'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function MainApp({ currentUser, onLogout }: MainAppProps) {
  // --- Persistent Storage State ---
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('wheres_my_stuff_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error fetching items from local storage, fallback to seed', e);
      }
    }
    return SEED_ITEMS;
  });

  useEffect(() => {
    localStorage.setItem('wheres_my_stuff_items', JSON.stringify(items));
  }, [items]);

  // --- Mobile Emulator UI Control States ---
  const [activeTab, setActiveTab] = useState<'home' | 'items' | 'reminders' | 'profile'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBackendCategory, setSelectedBackendCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [homeCategories, setHomeCategories] = useState<CategoryDTO[]>([]);
  const [homeItems, setHomeItems] = useState<ItemSummaryDTO[]>([]);
  const [homePage, setHomePage] = useState(1);
  const [homeTotal, setHomeTotal] = useState(0);
  const [isHomeLoading, setIsHomeLoading] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const homeRequestSeq = useRef(0);
  const homePageSize = 10;
  const [homeRefreshTick, setHomeRefreshTick] = useState(0);
  
  // Create / Edit overlay states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemRemark, setNewItemRemark] = useState('');
  const [newItemLocation, setNewItemLocation] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('');
  const [newItemReminder, setNewItemReminder] = useState<number>(30); // Default 30 days
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [createItemError, setCreateItemError] = useState<string | null>(null);

  // New location update overlay states
  const [isUpdateLocationOpen, setIsUpdateLocationOpen] = useState(false);
  const [targetUpdateItem, setTargetUpdateItem] = useState<Item | null>(null);
  const [updateLocationName, setUpdateLocationName] = useState('');
  const [updateLocationNote, setUpdateLocationNote] = useState('');

  // Primary visual asset and camera states
  const [newItemPhotos, setNewItemPhotos] = useState<PhotoDraft[]>([]);
  const [updateLocationPhotos, setUpdateLocationPhotos] = useState<string[]>([]);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [isCameraFlashing, setIsCameraFlashing] = useState(false);

  // Active documentation tab highlighting
  const [activeDocSection, setActiveDocSection] = useState('structure');

  // Success notifications indicator in the iPhone
  const [phoneNotification, setPhoneNotification] = useState<string | null>(null);

  // Sound/Vibration simulation trigger
  const [hapticTrigger, setHapticTrigger] = useState(false);

  const showNotification = (message: string) => {
    setPhoneNotification(message);
    setHapticTrigger(true);
    setTimeout(() => setHapticTrigger(false), 200);
    setTimeout(() => {
      setPhoneNotification(null);
    }, 3000);
  };

  useEffect(() => {
    categoryApi.list()
      .then((categories) => {
        setHomeCategories(categories);
        if (categories.length > 0) {
          setNewItemIcon((current) => current || String(categories[0].id));
        }
      })
      .catch((error) => {
        setHomeError(getAuthErrorMessage(error));
      });
  }, []);

  useEffect(() => {
    setHomePage(1);
  }, [searchQuery, selectedBackendCategory]);

  useEffect(() => {
    const requestID = ++homeRequestSeq.current;
    const timer = window.setTimeout(() => {
      setIsHomeLoading(true);
      setHomeError(null);

      itemApi.list({
        keyword: searchQuery.trim() || undefined,
        category_id: selectedBackendCategory === 'all' ? undefined : Number(selectedBackendCategory),
        page: homePage,
        page_size: homePageSize,
      })
        .then((result) => {
          if (requestID !== homeRequestSeq.current) return;
          setHomeItems(result.list);
          setHomeTotal(result.total);
        })
        .catch((error) => {
          if (requestID !== homeRequestSeq.current) return;
          setHomeItems([]);
          setHomeTotal(0);
          setHomeError(getAuthErrorMessage(error));
        })
        .finally(() => {
          if (requestID === homeRequestSeq.current) {
            setIsHomeLoading(false);
          }
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery, selectedBackendCategory, homePage, homeRefreshTick]);

  // --- Core Utility Calculations ---
  // Today's simulated date for calculation (as defined by ADDITIONAL_METADATA): June 6th, 2026
  const SIMULATED_TODAY = useMemo(() => new Date('2026-06-06T18:45:49Z'), []);

  // Check if an item requires verification (overdue confirmation period)
  const isItemOverdue = (item: Item) => {
    if (item.reminderDays === 0) return false;
    const lastConfirmed = new Date(item.lastConfirmedAt);
    const diffTime = Math.abs(SIMULATED_TODAY.getTime() - lastConfirmed.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= item.reminderDays;
  };

  // Days since last confirmation helper
  const getDaysSinceLastConfirm = (item: Item) => {
    const lastConfirmed = new Date(item.lastConfirmedAt);
    const diffTime = Math.abs(SIMULATED_TODAY.getTime() - lastConfirmed.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search Box Filter
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.remark.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.latestLocation.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category Circle Filter
      if (selectedCategory === 'all') return matchesSearch;
      
      const itemCategory = item.category || mapPhotoToCategory(item.photo);
      return matchesSearch && itemCategory === selectedCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Overdue items list
  const overdueItems = useMemo(() => {
    return items.filter(isItemOverdue);
  }, [items]);

  // --- Interaction Handlers ---
  const handleResetData = () => {
    if (window.confirm('是否重置模拟数据为初始优雅种子状态？')) {
      setItems(SEED_ITEMS);
      setSelectedItem(null);
      setActiveTab('home');
      showNotification('数据已重置为初始种子数据');
    }
  };

  // --- Visual Memory & Camera Simulation Utilities ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isForNewItem = true) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files as FileList).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isForNewItem) {
            setNewItemPhotos((prev) => [...prev, { src: reader.result as string, file }]);
          } else {
            setUpdateLocationPhotos((prev) => [...prev, reader.result as string]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
    showNotification('物品最新实体图片已转译成极速本地缓存');
  };

  const triggerCameraFlash = (callback: () => void) => {
    setIsCameraFlashing(true);
    setHapticTrigger(true);
    setTimeout(() => {
      setIsCameraFlashing(false);
      setHapticTrigger(false);
      callback();
    }, 220);
  };

  const handleSimulateShutter = (isForNewItem = true) => {
    triggerCameraFlash(() => {
      const randomIndex = Math.floor(Math.random() * SIMULATED_SCENE_POOL.length);
      const mockPhoto = SIMULATED_SCENE_POOL[randomIndex];
      if (isForNewItem) {
        setNewItemPhotos((prev) => [...prev, { src: mockPhoto }]);
      } else {
        setUpdateLocationPhotos((prev) => [...prev, mockPhoto]);
      }
      showNotification('📸 快门闪存成功！已留存现场视觉参考');
    });
  };

  // 1. Create New Item
  const resetCreateForm = () => {
    setNewItemName('');
    setNewItemRemark('');
    setNewItemLocation('');
    setNewItemNote('');
    setNewItemIcon(homeCategories[0] ? String(homeCategories[0].id) : '');
    setNewItemReminder(30);
    setNewItemPhotos([]);
    setCreateItemError(null);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemLocation.trim()) {
      setCreateItemError('请填写物品名称与当前最新位置');
      return;
    }
    if (!newItemIcon) {
      setCreateItemError('请先选择物品分类');
      return;
    }

    const reminderEnabled = newItemReminder > 0;
    const formData = new FormData();
    formData.append('category_id', newItemIcon);
    formData.append('name', newItemName.trim());
    formData.append('remark', newItemRemark.trim());
    formData.append('location', newItemLocation.trim());
    formData.append('note', newItemNote.trim() || newItemRemark.trim() || '首次登记录入随附初始位置照片凭据');
    formData.append('reminder_enabled', String(reminderEnabled));
    formData.append('reminder_days', String(reminderEnabled ? newItemReminder : 30));
    newItemPhotos.forEach((photo) => {
      if (photo.file) {
        formData.append('photos', photo.file);
      }
    });

    setIsCreatingItem(true);
    setCreateItemError(null);
    try {
      const createdItem = await itemApi.create(formData);
      setIsCreateOpen(false);
      resetCreateForm();
      setActiveTab('home');
      setSelectedItem(null);
      setSearchQuery('');
      setSelectedBackendCategory('all');
      setHomePage(1);
      setHomeRefreshTick((tick) => tick + 1);
      showNotification(`已新增物品「${createdItem.name || newItemName.trim()}」并同步到后端`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onLogout();
        return;
      }
      setCreateItemError(getAuthErrorMessage(error));
    } finally {
      setIsCreatingItem(false);
    }
  };

  // 2. Confirm Item is Still in its place (Haptically Confirmed)
  const handleConfirmStillHere = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const timestamp = SIMULATED_TODAY.toISOString();
          // Visual Context is duplicated to satisfy required photos structure in confirm nodes
          const previousRecord = item.history[0];
          const confirmPhotos = previousRecord?.photos?.length > 0 ? previousRecord.photos : [getDefaultPhotoForIcon(item.photo)];
          
          const newRecord: LocationRecord = {
            id: `rec-conf-${Date.now()}`,
            location: item.latestLocation,
            photos: confirmPhotos,
            timestamp: timestamp,
            note: '原地确认物品依然完好存放于此处',
            type: 'confirm',
          };
          return {
            ...item,
            lastConfirmedAt: timestamp,
            history: [newRecord, ...item.history],
          };
        }
        return item;
      })
    );
    
    // If we have selected item, update it in view
    if (selectedItem?.id === itemId) {
      setSelectedItem((prev) => {
        if (!prev) return null;
        const timestamp = SIMULATED_TODAY.toISOString();
        const previousRecord = prev.history[0];
        const confirmPhotos = previousRecord?.photos?.length > 0 ? previousRecord.photos : [getDefaultPhotoForIcon(prev.photo)];
        
        return {
          ...prev,
          lastConfirmedAt: timestamp,
          history: [
            {
              id: `rec-conf-${Date.now()}`,
              location: prev.latestLocation,
              photos: confirmPhotos,
              timestamp: timestamp,
              note: '原地确认物品依然完好存放于此处',
              type: 'confirm',
            },
            ...prev.history,
          ],
        };
      });
    }

    showNotification('已确认该物品仍在原处 👍');
  };

  // Open the "Move New Location" Drawer
  const openMoveLocationDrawer = (item: Item) => {
    setTargetUpdateItem(item);
    setUpdateLocationName('');
    setUpdateLocationNote('');
    setUpdateLocationPhotos([]); // resets previous location temporary images
    setIsUpdateLocationOpen(true);
  };

  // 3. New Location Record (Move Item)
  const handleUpdateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUpdateItem || !updateLocationName.trim()) {
      alert('请输入新位置描述');
      return;
    }

    const timestamp = SIMULATED_TODAY.toISOString();
    // Requirements or recommendations: replacement/capture of new visual frame
    const locPhotos = updateLocationPhotos.length > 0 
      ? updateLocationPhotos 
      : (targetUpdateItem.history[0]?.photos || [getDefaultPhotoForIcon(targetUpdateItem.photo)]);

    const newRecord: LocationRecord = {
      id: `rec-move-${Date.now()}`,
      location: updateLocationName.trim(),
      photos: locPhotos,
      timestamp: timestamp,
      note: updateLocationNote.trim() || '更新位置轨迹存储，摄入新视觉定位信息',
      type: 'move',
    };

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === targetUpdateItem.id) {
          return {
            ...item,
            latestLocation: updateLocationName.trim(),
            lastConfirmedAt: timestamp,
            history: [newRecord, ...item.history],
          };
        }
        return item;
      })
    );

    // Update details side view if active
    if (selectedItem?.id === targetUpdateItem.id) {
      setSelectedItem((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          latestLocation: updateLocationName.trim(),
          lastConfirmedAt: timestamp,
          history: [newRecord, ...prev.history],
        };
      });
    }

    setIsUpdateLocationOpen(false);
    setUpdateLocationPhotos([]);
    showNotification(`已移动并录入新视觉足迹：${updateLocationName}`);
  };

  // 4. Delete item
  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('确定要删除此物品及它的全部历史定位足迹吗？此操作不可逆。')) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setSelectedItem(null);
      showNotification('物品及历史溯源记录已被永久移除');
    }
  };

  // Helper to map presets or categories to Lucide icons
  const renderIconComponent = (iconId: string, className = 'w-6 h-6 text-white') => {
    const cat = mapPhotoToCategory(iconId);
    switch (cat) {
      case 'documents':
        return <FileText className={className} />;
      case 'photography':
        return <Camera className={className} />;
      case 'electronics':
        return <Cpu className={className} />;
      case 'keys':
        return <Key className={className} />;
      case 'files':
        return <FileText className={className} />;
      case 'valuables':
        return <Gem className={className} />;
      case 'others':
      default:
        return <Compass className={className} />;
    }
  };

  // Render gradient background for item cards based on their category
  const getIconGradient = (iconId: string) => {
    const cat = mapPhotoToCategory(iconId);
    const match = CATEGORY_SYSTEM.find((c) => c.id === cat);
    return match ? match.color : 'from-slate-550 to-slate-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-zinc-200 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white" id="root-layout">
      
      {/* Dynamic Header */}
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs" id="header-sect">
        <div className="flex items-center gap-3">
          <div className="bg-linear-to-tr from-slate-900 to-slate-800 p-2.5 rounded-2xl shadow-md ring-1 ring-slate-950/5 flex items-center justify-center">
            {/* Elegant App Logo Design: Magnifying Glass fused with custom Vector Key shape */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
              <path d="M9 11a2 2 0 1 1 4 0" />
              <path d="m14 14 3.5-1.5M16 13l2.5 2.5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-sans font-extrabold text-xl tracking-tight text-slate-900">我东西呢？</h1>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200/60 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">PROTOTYPE STUDIO</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Where's My Stuff? — 忘了放哪？点开即找。</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs text-xs text-slate-600 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
            {currentUser.email}
          </div>
          <button
            onClick={handleResetData}
            title="重置测试沙盒数据"
            className="px-3.5 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置沙盒</span>
          </button>
          <button
            onClick={onLogout}
            title="退出登录"
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出</span>
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="main-content">
        
        {/* ================= LEFT COLUMN: PRODUCT SPEC & BLUEPRINT DECK ================= */}
        <section className="lg:col-span-5 space-y-6 self-start" id="product-blueprint">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm shadow-slate-200/40">
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs uppercase tracking-widest font-extrabold mb-3.5">
              <BookOpen className="w-4 h-4" />
              <span>产品核心设计白皮书</span>
            </div>
            
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">
              《我东西呢？》产品企划
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">
              专为健忘高频数码用户、重要证件收集者打造的拟态 Apple/Notes 风格物品溯源微应用。突破了传统纯笔记只能记录最新单一状态、无法重现历史轨迹的局限。
            </p>

            {/* Sub-nav Tabs for spec description */}
            <div className="flex flex-wrap gap-1 bg-slate-50 p-1.5 rounded-2xl mb-6 border border-slate-200/50">
              {SECTIONS_DATA.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveDocSection(section.id)}
                  className={`flex-1 py-1.5 text-center text-xs font-bold rounded-xl transition-all duration-200 ${
                    activeDocSection === section.id
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {section.title.split(' ')[1] || section.title.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Selected Spec Detail Box */}
            <AnimatePresence mode="wait">
              {SECTIONS_DATA.map(
                (sec) =>
                  sec.id === activeDocSection && (
                    <motion.div
                      key={sec.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="bg-slate-50/60 rounded-2xl p-5 border border-slate-200/50"
                    >
                      <h3 className="text-slate-900 font-bold text-sm mb-3 pb-2 border-b border-slate-200/60 flex items-center justify-between">
                        <span>{sec.title}</span>
                        <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-md font-mono tracking-widest font-extrabold">SPEC</span>
                      </h3>
                      <div className="text-xs text-slate-600 leading-relaxed max-w-none space-y-3 font-medium">
                        {sec.content.split('\n').map((para, i) => {
                          if (para.startsWith('* ')) {
                            return (
                              <div key={i} className="flex gap-2 items-start text-slate-600 pl-1">
                                <span className="text-indigo-600 font-bold mt-0.5">•</span>
                                <div>
                                  {para.substring(2).split('➜').map((chunk, j, arr) => (
                                    <span key={j}>
                                      {chunk}
                                      {j < arr.length - 1 && <span className="text-amber-500 mx-1 font-bold">➜</span>}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return <p key={i} className="text-slate-600 font-medium">{para}</p>;
                        })}
                      </div>
                    </motion.div>
                  )
              )}
            </AnimatePresence>

            {/* Quick Design Feature list */}
            <div className="mt-6 pt-5 border-t border-slate-200/85 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 bg-indigo-50/40 text-indigo-900 hover:bg-indigo-50 transition-colors px-3 py-1.5 rounded-xl border border-indigo-100/60 font-semibold text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]"></div>
                <span>Things 3 物理微动</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50/40 text-emerald-950 hover:bg-emerald-50 transition-colors px-3 py-1.5 rounded-xl border border-emerald-100/60 font-semibold text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></div>
                <span>Reminders 周期核实</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 text-slate-900 hover:bg-slate-100 transition-colors px-3 py-1.5 rounded-xl border border-slate-200/60 font-semibold text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                <span>Pristine 极白高对比</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-50/40 text-amber-900 hover:bg-amber-50 transition-colors px-3 py-1.5 rounded-xl border border-amber-100/60 font-semibold text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]"></div>
                <span>Git Track 增量链条</span>
              </div>
            </div>
          </div>

          {/* Sandbox User Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between text-xs shadow-xs">
            <div className="flex items-center gap-2 text-slate-500 font-semibold">
              <User className="w-4 h-4 text-indigo-600" />
              <span>当前登录账号: </span>
              <span className="font-bold text-slate-800">{currentUser.email}</span>
            </div>
            <span className="bg-slate-50 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full scale-90">iPhone 仿真沙盒版</span>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: INTERACTIVE IPHONE 16 IMMERSIVE EMULATOR ================= */}
        <section className="lg:col-span-7 flex flex-col items-center justify-center py-2" id="emulator-section">
          
          {/* Subtle instructions for interacting */}
          <div className="text-xs text-slate-500 mb-3.5 flex items-center gap-2 bg-white/70 px-4 py-1.5 rounded-full border border-slate-200/60 shadow-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shadow-xs animate-pulse" />
            <span>右侧为<b>全交互式 iPhone PRO 移动模拟系统</b>，点击元素真实演练！</span>
          </div>

          <div
            className={`relative mx-auto w-full max-w-[390px] h-[780px] rounded-[54px] border-[11px] bg-slate-950 border-slate-900 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.15),0_0_40px_-5px_rgba(15,23,42,0.1)] overflow-hidden ring-4 ring-slate-200/50 transition-transform duration-200 ${
              hapticTrigger ? 'translate-y-0.5 scale-[0.995]' : ''
            }`}
            style={{ contentVisibility: 'auto' }}
          >
            {/* Top Ear Speaker & Dynamic Island Slot */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-[34px] bg-black rounded-[24px] z-50 flex items-center justify-center p-2 border border-slate-800/20">
              <div className="w-3 h-3 rounded-full bg-slate-900/90 mr-auto ml-1 border border-slate-800/60"></div>
              {/* Fake Micro speaker mesh */}
              <div className="absolute w-12 h-[3px] bg-neutral-900 rounded-full top-[3px]"></div>
            </div>

            {/* Volume controls & power button notches on sides */}
            <div className="absolute top-[140px] -left-[14px] w-[3px] h-[55px] bg-slate-900 rounded-r z-40"></div>
            <div className="absolute top-[210px] -left-[14px] w-[3px] h-[55px] bg-slate-900 rounded-r z-40"></div>
            <div className="absolute top-[180px] -right-[14px] w-[3px] h-[75px] bg-slate-900 rounded-l z-40"></div>

            {/* Dynamic Island pop-up message for notification simulation */}
            <AnimatePresence>
              {phoneNotification && (
                <motion.div
                  initial={{ width: 120, height: 34, top: 8, borderRadius: 24, opacity: 0.8 }}
                  animate={{ width: 320, height: 'auto', top: 12, borderRadius: 20, opacity: 1 }}
                  exit={{ width: 120, height: 34, top: 8, borderRadius: 24, opacity: 0 }}
                  className="absolute left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-white px-4 py-3.5 z-55 shadow-2xl border border-white/10 flex items-center gap-3.5 rounded-[22px] w-[90%]"
                >
                  <div className="p-1.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left leading-tight flex-1">
                    <p className="text-[9.5px] text-slate-400 font-mono font-bold tracking-wider">我东西呢？ 系统回执</p>
                    <p className="text-xs font-bold text-slate-100">{phoneNotification}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Screen Inner Container */}
            <div className="w-full h-full bg-slate-100 relative flex flex-col justify-between overflow-hidden select-none">
              
              {/* ================= EMULATOR STATUS BAR (iOS Style Black) ================= */}
              <div className="h-11 bg-slate-100 flex items-end justify-between px-6 pb-2 select-none z-30">
                <span className="text-xs font-bold text-slate-950 font-sans">18:45</span>
                
                {/* Visual Camera lens representation inside dynamic island */}
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-950/20 mr-12 pb-0.5"></span>

                <div className="flex items-center gap-1.5 text-slate-950">
                  <span className="text-[9px] font-bold">5G</span>
                  <div className="w-5 h-2.5 bg-slate-950 rounded-[3px] p-[1.5px] flex items-center">
                    <div className="h-full w-4/5 bg-slate-100 rounded-[1px]"></div>
                  </div>
                </div>
              </div>

              {/* ================= EMULATOR SCREEN INNER PORTAL ================= */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col pb-16 bg-[#F8FAFC] text-slate-800">
                
                {/* --- TAB 1: HOME (首页仪表盘) --- */}
                {activeTab === 'home' && (
                  <div className="p-4 space-y-5 animate-fadeIn">
                    
                    {/* Brand Banner Section */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="text-2xl font-black font-sans tracking-tight text-slate-900">我东西呢？</h3>
                        </div>
                        <p className="text-xs text-slate-400 font-bold">忘了放哪？来这里找。</p>
                      </div>

                      {/* Micro Brand Glyphs (Magnifying glass + Key) */}
                      <div className="w-10 h-10 bg-indigo-600 rounded-2xl shadow-xs flex items-center justify-center text-white">
                        <Key className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    {/* Apple Style search bar */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="想找什么？输入物品、位置、备注..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white hover:bg-slate-50/50 transition-all duration-200 focus:bg-white pl-10 pr-4 py-2.5 rounded-2xl text-[11.5px] font-semibold text-slate-800 placeholder-slate-400 border border-slate-200 shadow-3xs focus:outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-550"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-3 p-0.5 rounded-full bg-slate-200 text-slate-550 hover:text-slate-900"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                     {/* Quick Horizontal filters */}
                    <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
                      <button
                        onClick={() => setSelectedBackendCategory('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-250 border flex items-center gap-1 ${
                          selectedBackendCategory === 'all'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        🗂️ 全部
                      </button>
                      {homeCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedBackendCategory(String(cat.id))}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-250 border flex items-center gap-1 ${
                            selectedBackendCategory === String(cat.id)
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[13px]">{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* --- REMINDER ALERTS SECTION: 🚨 位置待核实 (Action Needed) --- */}
                    {overdueItems.length > 0 && !searchQuery && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            需要盘点核核 ({overdueItems.length})
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold font-mono">已超期未核实</span>
                        </div>

                        {/* Staggered dynamic slider for overdue items */}
                        <div className="space-y-3">
                          {overdueItems.map((item) => (
                            <div
                              key={item.id}
                              className="bg-white rounded-2xl border-l-[5px] border-l-rose-500 border border-slate-200 p-3.5 shadow-sm space-y-2.5 relative hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${getIconGradient(item.photo)} flex items-center justify-center text-white p-1 hover:scale-105 transition-transform`}>
                                    {renderIconComponent(item.photo, 'w-4 h-4 text-white')}
                                  </div>
                                  <div>
                                    <h5 className="text-[13px] font-bold text-slate-800 line-clamp-1">{item.name}</h5>
                                    <p className="text-[10px] text-slate-400 font-medium">上次确认: {getDaysSinceLastConfirm(item)} 天前</p>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200/30 text-xs">
                                <div className="flex items-start gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-slate-400 font-medium">登记位置：</span>
                                    <span className="font-extrabold text-slate-950 font-sans tracking-tight">{item.latestLocation}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-[11px] font-semibold text-slate-500 text-center py-1">
                                📢 物品已存放过久，确认还在同样位置吗？
                              </div>

                              {/* Interactive Action Buttons */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-100">
                                <button
                                  onClick={() => handleConfirmStillHere(item.id)}
                                  className="py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  还在原位
                                </button>
                                <button
                                  onClick={() => openMoveLocationDrawer(item)}
                                  className="py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  更新地点
                                </button>
                                <button
                                  onClick={() => {
                                    // Postpone reminder
                                    setItems((prev) =>
                                      prev.map((it) => {
                                        if (it.id === item.id) {
                                          return {
                                            ...it,
                                            // virtual 7 days forward postponement
                                            lastConfirmedAt: new Date(
                                              new Date(it.lastConfirmedAt).getTime() + 1000 * 60 * 60 * 24 * 7
                                            ).toISOString(),
                                          };
                                        }
                                        return it;
                                      })
                                    );
                                    showNotification('已选择延后核时，7天后再提醒');
                                  }}
                                  className="py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-lg text-[11px] font-medium transition-colors"
                                >
                                  稍后提醒
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* --- RECENTLY UPDATED ITEMS SECTION --- */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                          <CheckSquare className="w-4 h-4 text-slate-500" />
                          <span>物品实时记录 ({homeTotal})</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono">
                          {selectedBackendCategory !== 'all' ? `分类下筛选` : `第${homePage}页`}
                        </span>
                      </div>

                      {homeError ? (
                        <div className="bg-rose-50 rounded-2xl border border-rose-100 p-4 text-center space-y-1">
                          <AlertTriangle className="w-7 h-7 text-rose-400 mx-auto" />
                          <p className="text-xs font-bold text-rose-600">{homeError}</p>
                        </div>
                      ) : isHomeLoading ? (
                        <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center space-y-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse mx-auto"></div>
                          <p className="text-xs font-semibold text-slate-500">正在同步真实物品记录...</p>
                        </div>
                      ) : homeItems.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
                          <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
                          {homeTotal === 0 && !searchQuery.trim() && selectedBackendCategory === 'all' ? (
                            <p className="text-xs font-semibold text-slate-600">还没有记录物品，点击右上角钥匙按钮添加第一个物品。</p>
                          ) : (
                            <>
                              <p className="text-xs font-semibold text-slate-600">没有找到匹配检索的物品</p>
                              <p className="text-[10px] text-slate-400">试着换一换搜索词或分类筛选条件</p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {homeItems.map((item) => {
                            const prototypeCategory = backendCategoryToPrototypeCategory(item.category?.code);
                            const latestPhoto = resolveImageURL(item.cover_image) || getDefaultPhotoForIcon(prototypeCategory);
                            const lastUpdateTimeStr = formatDateTime(item.last_confirmed_at);

                            return (
                              <div
                                key={item.id}
                                onClick={() => showNotification('详情接口将在下一阶段接入')}
                                className="bg-white rounded-2xl border border-slate-100 p-3 flex items-start gap-3 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.99] relative animate-fadeIn"
                              >
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-3xs relative bg-slate-50 group-hover:scale-105 transition-transform duration-200">
                                  <img
                                    src={latestPhoto}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-slate-950 text-white flex items-center justify-center p-0.5 shadow-xs border border-white scale-80">
                                    <span className="text-[10px] leading-none">{item.category?.icon || '📦'}</span>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0 pr-1 space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="text-[13px] font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                      {item.name}
                                    </h5>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                  </div>

                                  <div className="flex items-center gap-1.5 text-slate-500">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <span className="text-[11.5px] font-extrabold text-slate-900 line-clamp-1">
                                      {item.latest_location}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between pt-0.5 text-[9.5px] font-medium text-slate-400">
                                    <span className="truncate max-w-[120px]">
                                      {item.remark ? item.remark : '无补充备注描述'}
                                    </span>
                                    <span className="font-mono text-indigo-600 font-bold shrink-0">
                                      核对时间: {lastUpdateTimeStr}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {homeTotal > homePageSize && (
                        <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-3 py-2 text-[10px] font-bold text-slate-500">
                          <button
                            type="button"
                            disabled={homePage <= 1 || isHomeLoading}
                            onClick={() => setHomePage((page) => Math.max(1, page - 1))}
                            className="px-2.5 py-1 rounded-full bg-slate-50 disabled:text-slate-300 disabled:bg-slate-50 text-slate-700 hover:bg-slate-100"
                          >
                            上一页
                          </button>
                          <span>
                            {homePage} / {Math.max(1, Math.ceil(homeTotal / homePageSize))}
                          </span>
                          <button
                            type="button"
                            disabled={homePage >= Math.ceil(homeTotal / homePageSize) || isHomeLoading}
                            onClick={() => setHomePage((page) => page + 1)}
                            className="px-2.5 py-1 rounded-full bg-slate-50 disabled:text-slate-300 disabled:bg-slate-50 text-slate-700 hover:bg-slate-100"
                          >
                            下一页
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- TAB 2: ITEMS LIST (所有藏品大厅) --- */}
                {activeTab === 'items' && (
                  <div className="p-4 space-y-4 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">物品保管箱</h3>
                        <p className="text-[11px] text-slate-500">记录物品的全生命周期及流变地址</p>
                      </div>
                      
                      {/* Plus button inside the iPhone component */}
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="p-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md shadow-indigo-600/30 flex items-center justify-center active:scale-95 transition-transform"
                        style={{ padding: '0.6rem' }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Filter counters */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-xs">
                        <div className="text-base font-extrabold text-slate-800">{items.length}</div>
                        <div className="text-[9px] text-slate-400 font-medium">总收录物品</div>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-xs">
                        <div className="text-base font-extrabold text-emerald-600">
                          {items.filter(it => !isItemOverdue(it)).length}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">安全状态中</div>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-xs">
                        <div className="text-base font-extrabold text-rose-500">{overdueItems.length}</div>
                        <div className="text-[9px] text-slate-400 font-medium">急需盘点确认</div>
                      </div>
                    </div>

                    {/* Simple list in alphabetical / time order */}
                    <div className="space-y-2">
                      {items.map((item) => {
                        const itemPhoto = item.history[0]?.photos?.[0] || getDefaultPhotoForIcon(item.photo);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="bg-white rounded-xl border border-slate-100 p-3 hover:border-slate-300 transition-colors cursor-pointer group flex items-center gap-3 relative"
                          >
                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-3xs relative bg-slate-50">
                              <img
                                src={itemPhoto}
                                alt={item.name}
                                className="w-full h-full object-cover animate-fadeIn"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-md bg-slate-900 text-white flex items-center justify-center p-0.5 shadow-xs border border-white scale-80">
                                {renderIconComponent(item.photo, 'w-2 h-2 text-white')}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-2">
                              <h5 className="text-xs font-extrabold text-slate-800 line-clamp-1">{item.name}</h5>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="font-bold text-slate-900 truncate">{item.latestLocation}</span>
                              </div>
                            </div>

                            <div className="text-[9px] text-slate-500 text-right shrink-0">
                              <p className="font-mono font-medium text-slate-400">周期: {item.reminderDays}天</p>
                              <p className="font-bold text-indigo-600 group-hover:text-indigo-800 transition-colors mt-0.5">查看足迹 &rarr;</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- TAB 3: REMINDERS LIST (待盘点列表) --- */}
                {activeTab === 'reminders' && (
                  <div className="p-4 space-y-4 animate-fadeIn">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">到期监督面板</h3>
                      <p className="text-[11px] text-slate-500">守护可能落入盲区忘记所在的物件</p>
                    </div>

                    <div className="space-y-3">
                      {items.map((item) => {
                        const days = getDaysSinceLastConfirm(item);
                        const isOverdue = isItemOverdue(item);
                        const reminderPhoto = item.history[0]?.photos?.[0] || getDefaultPhotoForIcon(item.photo);
                        return (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl border border-slate-100 p-3 space-y-2 text-slate-800 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 relative bg-slate-50">
                                  <img
                                    src={reminderPhoto}
                                    alt={item.name}
                                    className="w-full h-full object-cover animate-fadeIn"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-md bg-slate-900 text-white flex items-center justify-center p-0.5 shadow-xs border border-white scale-80">
                                    {renderIconComponent(item.photo, 'w-2.5 h-2.5 text-white')}
                                  </div>
                                </div>
                                <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</h5>
                              </div>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isOverdue ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {isOverdue ? '需盘点' : '安全存放'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 p-2 rounded-lg py-1.5 border border-slate-200/50">
                              <div>
                                <span className="text-slate-400 font-medium">上次确认: </span>
                                <span className="font-bold text-slate-700">{days} 天前</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">盘点周期: </span>
                                <span className="font-bold text-slate-700">{item.reminderDays} 天</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] bg-indigo-50/20 px-2 py-1 rounded">
                              <span className="text-slate-500 text-[10.5px]">当前存放: <b>{item.latestLocation}</b></span>
                              <button
                                onClick={() => handleConfirmStillHere(item.id)}
                                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 shrink-0 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                完好在
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- TAB 4: PROFILE STATUS (数据统计主页) --- */}
                {activeTab === 'profile' && (
                  <div className="p-4 space-y-5 animate-fadeIn">
                    {/* Tiny visual profile banner */}
                    <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                      <div className="w-11 h-11 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-extrabold text-slate-800 truncate">{currentUser.email}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500 mt-0.5 font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{currentUser.username} 的本地保险箱托管中</span>
                        </div>
                      </div>
                      <button
                        onClick={onLogout}
                        className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center hover:text-slate-900 hover:bg-slate-100"
                        title="退出登录"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dynamic Status Stats Bento block */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 text-left">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                          安全守护天数
                        </span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">56天</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 text-left">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                          累计转移痕迹
                        </span>
                        <span className="text-2xl font-black text-indigo-600 leading-tight">
                          {items.reduce((acc, curr) => acc + curr.history.length, 0)}条
                        </span>
                      </div>
                    </div>

                    {/* Core App Information Accordion */}
                    <div className="bg-white rounded-xl border border-slate-100 p-3.5 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>关于《我东西呢？》</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        物品经常乱放？身份证、钥匙、护照每次出门都要疯狂寻找？我们在传统笔记形式上新增了<b>位置历史链</b>与<b>定期主动确认巡检</b>功能，确保你对自己的绝对物品处于掌控状态。
                      </p>
                      
                      <div className="bg-slate-50 p-2.5 rounded-lg text-[9px] text-slate-400 space-y-1">
                        <p>&bull; 采用 Apple Notes/Things 3 全物理动态阻力渲染</p>
                        <p>&bull; 所有记录本地安全缓存，不上传未授权云端</p>
                        <p>&bull; 离线可读，在飞机/地铁极弱网络中依然可秒开检索位置</p>
                      </div>
                    </div>

                    {/* Developer Credits */}
                    <div className="text-center space-y-1">
                      <p className="text-[10px] text-slate-400">我东西呢？ (Where's My Stuff?)</p>
                      <p className="text-[9px] text-slate-300">Apple Reminders & Notion Mobile Design Pairings v1.1</p>
                    </div>
                  </div>
                )}

              </div>

              {/* ================= BOTTOM NAVIGATION TABS ================= */}
              <div className="absolute bottom-0 inset-x-0 h-[60px] bg-white border-t border-slate-200 flex items-center justify-around px-2 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.03)]" id="tabs-sect">
                {[
                  { id: 'home', label: '首页', icon: Compass },
                  { id: 'items', label: '物品仓', icon: Layers },
                  { id: 'reminders', label: '核对板', icon: Bell },
                  { id: 'profile', label: '我的', icon: User },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setSelectedItem(null); // Clear item detailed views when navigating to avoid overlapping
                      }}
                      className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-colors relative ${
                        isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-400 font-medium'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-0.5" />
                      <span className="text-[9.5px] tracking-wide">{tab.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="activeIndicator"
                          className="absolute bottom-0 w-8 h-1 bg-indigo-600 rounded-t-full"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {tab.id === 'reminders' && overdueItems.length > 0 && (
                        <span className="absolute top-2 right-5 w-2 h-2 rounded-full bg-rose-500"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* iOS Home Indicator Bar */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-900 rounded-full z-30 opacity-70 pointer-events-none"></div>

              {/* ================= OVERLAY SCREEN: ITEM DETAIL VIEW (物品详情及历史时间轴) ================= */}
              <AnimatePresence>
                {selectedItem && (
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="absolute inset-0 bg-[#F8FAFC] z-40 flex flex-col pt-12 pb-16"
                  >
                    {/* Header bar */}
                    <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0">
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="text-indigo-600 text-xs font-bold flex items-center gap-0.5 active:scale-95 transition-transform"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        返回
                      </button>
                      <h4 className="text-xs font-bold text-slate-800 text-center truncate max-w-[180px]">
                        物品详情
                      </h4>
                      <button
                        onClick={() => handleDeleteItem(selectedItem.id)}
                        className="text-rose-500 hover:text-rose-700 font-medium text-xs scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Detailed Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      
                      {/* Premium Cover Badge Card */}
                      <div className={`bg-gradient-to-tr ${getIconGradient(selectedItem.photo)} rounded-2xl p-4 text-white flex flex-col items-center justify-center text-center shadow-md space-y-2 relative overflow-hidden`}>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                        <div className="p-2.5 bg-white/10 rounded-full backdrop-blur-md shadow-inner">
                          {renderIconComponent(selectedItem.photo, 'w-6 h-6 text-white')}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold tracking-tight">{selectedItem.name}</h4>
                          <p className="text-[9.5px] text-white/70 font-mono mt-0.5">
                            建档时间: {new Date(selectedItem.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>

                      {/* Rule 3.1: Current Location Photo (Active Visual Context Card) */}
                      {selectedItem.history[0]?.photos && selectedItem.history[0].photos.length > 0 && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">最新实地存放照片</span>
                          <div className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100 h-40">
                            <img
                              src={selectedItem.history[0].photos[0]}
                              alt="Current Location Photo"
                              onClick={() => setActiveLightboxImage(selectedItem.history[0]?.photos?.[0] || null)}
                              className="w-full h-full object-cover cursor-zoom-in group-hover:scale-102 transition-transform duration-350"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-3 flex items-end justify-between text-white">
                              <div className="text-[10.5px] drop-shadow-md">
                                <span className="font-extrabold">{selectedItem.latestLocation}</span>
                                <span className="block opacity-80 mt-0.5 text-[9px] font-mono">
                                  登记核对于 {new Date(selectedItem.history[0].timestamp).toLocaleString('zh-CN')}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded leading-none shrink-0 border border-white/20">
                                放大图
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rule 3.2: Historical location photos gallery track */}
                      {selectedItem.history.flatMap(h => h.photos || []).length > 1 && (
                        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-3xs space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">历次位置足迹图像廊</span>
                          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                            {selectedItem.history.flatMap(h => (h.photos || []).map(p => ({ photo: p, loc: h.location, date: h.timestamp }))).map((phItem, index) => (
                              <div
                                key={index}
                                onClick={() => setActiveLightboxImage(phItem.photo)}
                                className="w-16 h-16 rounded-xl overflow-hidden relative border border-slate-200 shrink-0 group cursor-zoom-in bg-slate-50 transition-shadow active:scale-95"
                              >
                                <img
                                  src={phItem.photo}
                                  alt={`History Photo ${index}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1 text-center">
                                  <span className="text-[7.5px] text-white font-semibold truncate max-w-full">
                                    {phItem.loc}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Particular Details List */}
                      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs space-y-3.5">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">物品备注 & 用途描述</span>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            {selectedItem.remark ? selectedItem.remark : '该搜寻记录还未填写相关用途说明。'}
                          </p>
                        </div>

                        {/* HIGHLIGHTED LATEST LOCATION BOX */}
                        <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-200/50 space-y-1.5 shadow-inner">
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>当前所在最新位置 (Latest Spot)</span>
                          </span>
                          <p className="text-sm font-extrabold text-indigo-950 font-sans tracking-tight">
                            {selectedItem.latestLocation}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-medium border-t border-indigo-100/50">
                            <span>上次核查时间:</span>
                            <span className="font-bold text-indigo-700">
                              {new Date(selectedItem.lastConfirmedAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>

                        {/* Setting reminder info */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>巡视盘点周期:</span>
                          </span>
                          <span className="font-extrabold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            每 {selectedItem.reminderDays} 天盘核
                          </span>
                        </div>
                      </div>

                      {/* Action buttons under item detail */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setItems((prev) =>
                              prev.map((it) => {
                                if (it.id === selectedItem.id) {
                                  const timestamp = SIMULATED_TODAY.toISOString();
                                  const previousRecord = it.history[0];
                                  const confirmPhotos = previousRecord?.photos?.length > 0 ? previousRecord.photos : [getDefaultPhotoForIcon(it.photo)];
                                  return {
                                    ...it,
                                    lastConfirmedAt: timestamp,
                                    history: [
                                      {
                                        id: `rec-subconf-${Date.now()}`,
                                        location: it.latestLocation,
                                        photos: confirmPhotos,
                                        timestamp,
                                        note: '原地核查：物理位置未变更，视觉完好。',
                                        type: 'confirm',
                                      },
                                      ...it.history,
                                    ],
                                  };
                                }
                                return it;
                              })
                            );
                            // Also update selected
                            setSelectedItem((prev) => {
                              if (!prev) return null;
                              const timestamp = SIMULATED_TODAY.toISOString();
                              const previousRecord = prev.history[0];
                              const confirmPhotos = previousRecord?.photos?.length > 0 ? previousRecord.photos : [getDefaultPhotoForIcon(prev.photo)];
                              return {
                                ...prev,
                                lastConfirmedAt: timestamp,
                                history: [
                                  {
                                    id: `rec-subconf-${Date.now()}`,
                                    location: prev.latestLocation,
                                    photos: confirmPhotos,
                                    timestamp,
                                    note: '原地核查：物理位置未变更，视觉完好。',
                                    type: 'confirm',
                                  },
                                  ...prev.history,
                                ],
                              };
                            });
                            showNotification('位置无变动，健康记录刷新！');
                          }}
                          className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 text-center active:scale-[0.98] transition-all flex items-center justify-center gap-1 border-0"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>原地核对完好</span>
                        </button>
                        <button
                          onClick={() => openMoveLocationDrawer(selectedItem)}
                          className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md shadow-slate-900/10 text-center active:scale-[0.98] transition-all flex items-center justify-center gap-1 border-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5 rotate-180" />
                          <span>更新位置</span>
                        </button>
                      </div>

                      {/* ================= LOCATION HISTORY TIMELINE (Rule 3.3: Timeline with Photos) ================= */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1 pt-1">
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          <span>位置变动历史链条 ({selectedItem.history.length})</span>
                        </h5>

                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs relative">
                          {/* Dotted center lines helper */}
                          <div className="absolute left-[25px] top-[26px] bottom-[26px] w-[2px] border-l border-dashed border-slate-200"></div>

                          <div className="space-y-4 relative">
                            {selectedItem.history.map((record, index) => {
                              const isMove = record.type === 'move';
                              return (
                                <div key={record.id} className="flex gap-3 items-start select-none">
                                  {/* Milestone timeline bullet */}
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 p-0.5 shadow-sm ${
                                    isMove 
                                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-600' 
                                      : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                  }`}>
                                    {isMove ? <MapPin className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                  </div>

                                  <div className="flex-1 min-w-0 pr-1 space-y-1">
                                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                                      <span className="font-semibold">{new Date(record.timestamp).toLocaleString('zh-CN')}</span>
                                      <span className={`px-1 py-0.1 rounded font-bold ${
                                        isMove ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                                      }`}>
                                        {isMove ? '变更地' : '确认还在'}
                                      </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-800">{record.location}</p>
                                    {record.note && (
                                      <p className="text-[10px] text-slate-400 italic">
                                        &ldquo;{record.note}&rdquo;
                                      </p>
                                    )}

                                    {/* Inline nested chronological photos */}
                                    {record.photos && record.photos.length > 0 && (
                                      <div className="flex gap-1.5 flex-wrap pt-1">
                                        {record.photos.map((ph, phIdx) => (
                                          <div
                                            key={phIdx}
                                            onClick={() => setActiveLightboxImage(ph)}
                                            className="w-14 h-14 rounded-lg overflow-hidden border border-slate-100 shrink-0 cursor-zoom-in bg-slate-50 relative group active:scale-95 duration-100 hover:border-slate-300"
                                          >
                                            <img
                                              src={ph}
                                              alt={`timeline-${phIdx}`}
                                              className="w-full h-full object-cover"
                                              referrerPolicy="no-referrer"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ================= OVERLAY DIALOG: CREATE NEW ITEM OVERLAY ================= */}
              <AnimatePresence>
                {isCreateOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs"
                  >
                    <motion.form
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                      onSubmit={handleCreateItem}
                      className="w-full bg-[#F8FAFC] rounded-t-[36px] max-h-[90%] overflow-y-auto p-5 pb-10 space-y-4 border-t border-slate-200 text-slate-800"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h4 className="text-sm font-bold text-slate-900">登记新防丢物件</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateOpen(false);
                            resetCreateForm();
                          }}
                          className="p-1 rounded-full bg-slate-200 text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3 text-xs">
                        {/* 1. Item name */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">物品名称 <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            placeholder="如：我的日常身份证、A层相机备用电池"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            required
                            className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                          />
                        </div>

                        {/* 2. Remark */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">补充备注（选填）</label>
                          <input
                            type="text"
                            placeholder="如：带金属套；补办极其繁琐"
                            value={newItemRemark}
                            onChange={(e) => setNewItemRemark(e.target.value)}
                            className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                          />
                        </div>

                        {/* 3. Initial location */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">当前放在什么具体地方？ <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            placeholder="如：客厅玄关左手钥匙托盘、灰色书包暗袋"
                            value={newItemLocation}
                            onChange={(e) => setNewItemLocation(e.target.value)}
                            required
                            className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                          />
                        </div>

                        {/* 3.5 Initial location note */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">初始位置备注（选填）</label>
                          <input
                            type="text"
                            placeholder="如：放在第二层左侧，旁边是相机包"
                            value={newItemNote}
                            onChange={(e) => setNewItemNote(e.target.value)}
                            className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                          />
                        </div>

                        {/* 4. Redesigned Category Selector */}
                        <div className="space-y-1.5 animate-fadeIn">
                          <label className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            <span>物品所属属性分类 (Category) <span className="text-rose-500">*</span></span>
                          </label>
                          <p className="text-[10px] text-slate-400">
                            请为此物品选定关联归类，系统已配置专属标志。
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                            {homeCategories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setNewItemIcon(String(cat.id));
                                  // Auto-recommend a sensible reminder interval if none set yet
                                  if (cat.code === 'key') setNewItemReminder(7);
                                  else if (cat.code === 'camera' || cat.code === 'electronics') setNewItemReminder(14);
                                  else if (cat.code === 'document' || cat.code === 'file' || cat.code === 'valuable') setNewItemReminder(30);
                                }}
                                className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all duration-150 active:scale-[0.98] ${
                                  newItemIcon === String(cat.id)
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow shadow-indigo-600/30'
                                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                                }`}
                              >
                                <span className="text-lg shrink-0 mt-0.5">{cat.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <span className={`text-[11px] font-bold block ${newItemIcon === String(cat.id) ? 'text-white' : 'text-slate-800'}`}>{cat.name}</span>
                                  <span className={`text-[9px] block truncate mt-0.5 ${newItemIcon === String(cat.id) ? 'text-white/80 font-medium' : 'text-slate-400 font-medium'}`}>
                                    {cat.description}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Rule 4: Visual Context Photo Section (Strongly Encourage Taking Photo) */}
                        <div className="space-y-2 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-200/40">
                          <label className="font-bold text-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs text-indigo-950">
                              <Camera className="w-4 h-4 text-indigo-600" />
                              <span>现场存放视觉照 (Strongly Recommended)</span>
                            </span>
                            <span className="text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-md animate-pulse">
                              极力推荐
                            </span>
                          </label>
                          <div className="text-[10px] text-indigo-900 border border-indigo-200/60 bg-indigo-100/35 p-2 rounded-xl leading-relaxed space-y-1">
                            <p className="font-bold">📷 Uploading a location photo is highly recommended and significantly improves the chance of finding the item later.</p>
                            <p className="text-slate-500 font-medium font-sans">实拍物件所处的周边视觉标记物、环境特写，远比单纯文字记录更能瞬间激起大脑回忆。</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* file uploader */}
                            <label className="h-12 border border-dashed border-indigo-300 rounded-xl flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-indigo-50/50 transition-colors">
                              <Upload className="w-4 h-4 text-indigo-600 mb-0.5 animate-bounce" />
                              <span className="text-[9.5px] font-bold text-indigo-700">外部相册照片</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handlePhotoUpload(e, true)}
                                className="hidden"
                              />
                            </label>

                            {/* camera simulator */}
                            <button
                              type="button"
                              onClick={() => handleSimulateShutter(true)}
                              className="h-12 border border-slate-200 rounded-xl flex flex-col items-center justify-center bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 duration-150 active:scale-95"
                            >
                              <Camera className="w-4 h-4 mb-0.5 text-indigo-200" />
                              <span className="text-[9.5px] font-bold">模拟镜头拍摄</span>
                            </button>
                          </div>

                          {/* Previews */}
                          {newItemPhotos.length > 0 ? (
                            <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                              {newItemPhotos.map((photo, i) => (
                                <div key={i} className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group animate-fadeIn">
                                  <img src={photo.src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <button
                                    type="button"
                                    onClick={() => setNewItemPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white scale-75"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-2 border border-dashed border-slate-200 rounded-xl mt-1.5 text-[9.5px] text-amber-600 font-medium bg-amber-50/30">
                              ⚠️ 暂未留存实拍：推荐上传或实拍照片，方便未来按图索骥
                            </div>
                          )}
                        </div>

                        {/* 5. Reminder Interval */}
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">设定安全巡检盘点频率</label>
                          <select
                            value={newItemReminder}
                            onChange={(e) => setNewItemReminder(Number(e.target.value))}
                            className="w-full bg-white px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-50/20 text-slate-900 font-medium"
                          >
                            <option value={7}>每 7 天 (如钥匙、手提包高频物件)</option>
                            <option value={14}>每 14 天 (如常随身充电器)</option>
                            <option value={30}>每 30 天 (如身份证/备用电池常态物件)</option>
                            <option value={90}>每 90 天 (如极其低频的护照、不动产证)</option>
                            <option value={0}>不设核对点 (纯归纳存放，手动维护)</option>
                          </select>
                        </div>
                      </div>

                      {createItemError && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold px-3 py-2 rounded-2xl">
                          {createItemError}
                        </div>
                      )}

                      <div className="pt-3">
                        <button
                          type="submit"
                          disabled={isCreatingItem}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-colors"
                        >
                          {isCreatingItem ? '正在同步到后端...' : '录入保管箱 & 记录初始轨迹 →'}
                        </button>
                      </div>
                    </motion.form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ================= OVERLAY DIALOG: UPDATE LOCATION DRAWER ================= */}
              <AnimatePresence>
                {isUpdateLocationOpen && targetUpdateItem && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-xs"
                  >
                    <motion.form
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                      onSubmit={handleUpdateLocation}
                      className="w-full bg-[#F8FAFC] rounded-t-[36px] max-h-[90%] overflow-y-auto p-5 pb-10 space-y-4 border-t border-slate-200 text-slate-800"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            移动物品位置 (Append Track)
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">物品: {targetUpdateItem.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUpdateLocationOpen(false);
                            setUpdateLocationName('');
                            setUpdateLocationNote('');
                          }}
                          className="p-1 rounded-full bg-slate-200 text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">新存放地位置描述 <span className="text-rose-500">*</span></label>
                          <input
                            type="text"
                            placeholder="如：移到了玄关右手大抽屉、背包含着"
                            value={updateLocationName}
                            onChange={(e) => setUpdateLocationName(e.target.value)}
                            required
                            className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-semibold text-slate-700 block">追溯轨迹备忘原由 & 目的地</label>
                          <input
                            type="text"
                            placeholder="如：带去银行开户后暂存；为了防小孩子乱放"
                            value={updateLocationNote}
                            onChange={(e) => setUpdateLocationNote(e.target.value)}
                            className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900"
                          />
                        </div>

                        {/* Rule 5: Updating a location should require or recommend uploading a new photo */}
                        <div className="space-y-1.5 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/60">
                          <label className="font-bold text-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-amber-950">
                              <Camera className="w-4 h-4 text-amber-600 animate-pulse" />
                              <span>更新目的地实景照片 (强烈推荐)</span>
                            </span>
                            <span className="text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.5 rounded-md">
                              重要提示
                            </span>
                          </label>
                          <div className="text-[10px] text-amber-900 border border-amber-200/60 bg-amber-100/20 p-2 rounded-xl leading-relaxed space-y-1">
                            <p className="font-bold">⚠️ Updating a location should always keep its reference visual context accurate; uploading a new photo is highly recommended when moving an item!</p>
                            <p className="text-slate-500 font-medium">物件位置发生了变动，上传最新的存放环境照，才能真正发挥「视觉溯源」的记忆唤醒效果。</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {/* file uploader */}
                            <label className="h-12 border border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                              <Upload className="w-3.5 h-3.5 text-amber-600 mb-0.5" />
                              <span className="text-[9px] font-bold text-amber-700">外部相册照片</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handlePhotoUpload(e, false)}
                                className="hidden"
                              />
                            </label>

                            {/* camera simulator */}
                            <button
                              type="button"
                              onClick={() => handleSimulateShutter(false)}
                              className="h-12 border border-slate-200 rounded-xl flex flex-col items-center justify-center bg-amber-500 text-white shadow-xs hover:bg-amber-600 duration-150 active:scale-95"
                            >
                              <Camera className="w-3.5 h-3.5 mb-0.5" />
                              <span className="text-[9px] font-bold">快门模拟拍摄</span>
                            </button>
                          </div>

                          {/* Previews */}
                          {updateLocationPhotos.length > 0 ? (
                            <div className="grid grid-cols-4 gap-1.5 pt-1.5 animate-fadeIn">
                              {updateLocationPhotos.map((src, i) => (
                                <div key={i} className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
                                  <img src={src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <button
                                    type="button"
                                    onClick={() => setUpdateLocationPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white scale-75"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-2 border border-dashed border-slate-200 rounded-xl mt-1.5 text-[9.5px] text-slate-500 bg-slate-50">
                              💡 留白备忘：若未上传，本次迁移将沿用此前的旧历史存放痕迹照
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-colors"
                        >
                          追加位置轨迹 &rarr;
                        </button>
                      </div>
                    </motion.form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ================= LIGHTBOX PORTAL VIEW (大图沉浸式预览) ================= */}
              <AnimatePresence>
                {activeLightboxImage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveLightboxImage(null)}
                    className="absolute inset-0 bg-black/95 z-55 flex flex-col items-center justify-center p-4 cursor-pointer backdrop-blur-md"
                  >
                    <div className="absolute top-12 left-4 text-white text-[11px] font-mono opacity-80 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
                      💡 点击任意空白处返回
                    </div>
                    <button
                      onClick={() => setActiveLightboxImage(null)}
                      className="absolute top-11 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center cursor-pointer active:scale-90"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="max-w-full max-h-[75%] rounded-2xl overflow-hidden shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
                      <img
                        src={activeLightboxImage}
                        alt="Enlarged Context Memory"
                        className="w-full h-full object-contain max-h-[60vh] max-w-[90vw]"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="mt-4 text-[#F8FAFC] text-center space-y-1">
                      <p className="text-white text-xs font-semibold">🔍 存放环境现场环境快照</p>
                      <p className="text-slate-400 text-[10px]">真实视觉周边记忆，相比纯文字更容易被大脑瞬间检索。</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
          
        </section>

      </main>

      {/* Modern Sub-footer credit */}
      <footer className="border-t border-slate-800 bg-slate-950/40 text-center py-6 px-4 text-xs text-slate-500 mt-auto" id="main-footer">
        <p>我东西呢？ (Where's My Stuff?) 一款旨在解决经常丢三落四、忘记物品收纳足迹痛点的移动极简工具。</p>
        <p className="mt-1">Designed by Google AI Studio Build & Antigravity Agent. Built with standard React, Tailwind CSS and Lucide-react.</p>
      </footer>

    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    authApi.profile()
      .then((user) => {
        setCurrentUser(user);
      })
      .catch(() => {
        clearStoredToken();
        setCurrentUser(null);
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
  }, []);

  const handleLogin = async (payload: LoginPayload) => {
    setAuthError(null);
    setIsAuthSubmitting(true);
    try {
      const result = await authApi.login(payload);
      setStoredToken(result.token);
      setCurrentUser(result.user);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleRegister = async (payload: RegisterPayload) => {
    setAuthError(null);
    setIsAuthSubmitting(true);
    try {
      await authApi.register(payload);
      const result = await authApi.login({
        email: payload.email,
        password: payload.password,
      });
      setStoredToken(result.token);
      setCurrentUser(result.user);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearStoredToken();
    setCurrentUser(null);
    setAuthMode('login');
    setAuthError(null);
  };

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-zinc-200 text-slate-900 flex items-center justify-center font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm shadow-slate-200/40 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse"></div>
          <span className="text-sm font-black text-slate-700">正在恢复登录状态...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        mode={authMode}
        error={authError}
        isLoading={isAuthSubmitting}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthError(null);
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return <MainApp currentUser={currentUser} onLogout={handleLogout} />;
}
