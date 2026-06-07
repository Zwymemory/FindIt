import { request } from './request';
import type { CategoryDTO } from './category';

export interface ItemSummaryDTO {
  id: number;
  category: CategoryDTO;
  name: string;
  remark: string;
  cover_image: string;
  latest_location: string;
  reminder_enabled: boolean;
  reminder_days: number;
  last_confirmed_at: string | null;
  next_remind_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemImageDTO {
  id: number;
  image_url: string;
  is_cover: boolean;
  sort: number;
  created_at: string;
}

export interface LocationRecordDTO {
  id: number;
  location: string;
  note: string;
  type: 'create' | 'move' | 'confirm';
  created_at: string;
  images: ItemImageDTO[];
}

export interface ItemDetailDTO extends ItemSummaryDTO {
  images: ItemImageDTO[];
  latest_record: LocationRecordDTO | null;
}

export interface ItemListParams {
  keyword?: string;
  category_id?: number;
  page?: number;
  page_size?: number;
}

export interface PageResult<T> {
  list: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface ReminderItemDTO extends ItemSummaryDTO {
  overdue_days: number;
}

export const itemApi = {
  list(params?: ItemListParams) {
    return request.get<unknown, PageResult<ItemSummaryDTO>>('/items', { params });
  },

  create(formData: FormData) {
    return request.post<unknown, ItemSummaryDTO>('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  detail(id: number) {
    return request.get<unknown, ItemDetailDTO>(`/items/${id}`);
  },

  history(id: number) {
    return request.get<unknown, LocationRecordDTO[]>(`/items/${id}/history`);
  },

  updateLocation(id: number, formData: FormData) {
    return request.post<unknown, LocationRecordDTO>(`/items/${id}/location`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  confirm(id: number, formData: FormData) {
    return request.post<unknown, LocationRecordDTO>(`/items/${id}/confirm`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  reminders() {
    return request.get<unknown, ReminderItemDTO[]>('/reminders');
  },
};
