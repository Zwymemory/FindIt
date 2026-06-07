/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LocationRecord {
  id: string;
  location: string;
  photos: string[]; // One or more photos (can be URLs or Base64 data strings)
  timestamp: string; // ISO string
  note?: string;
  type: 'move' | 'confirm';
}

export interface Item {
  id: string;
  name: string;
  remark: string;
  createdAt: string; // ISO string
  photo: string; // Preset SVG identifier, color name, or Custom Base64 string
  category?: string; // Redesigned category system identifier
  latestLocation: string;
  lastConfirmedAt: string; // ISO string
  reminderDays: number; // e.g., 30, 90, etc.
  history: LocationRecord[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  examples: string[];
  color: string;
  exampleText: string;
}

export interface ProductFeatureInfo {
  title: string;
  description: string;
  icon: string;
}
