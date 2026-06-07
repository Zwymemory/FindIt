import { request } from './request';

export interface CategoryDTO {
  id: number;
  name: string;
  code: string;
  icon: string;
  description: string;
  sort: number;
}

export const categoryApi = {
  list() {
    return request.get<unknown, CategoryDTO[]>('/categories');
  },
};
