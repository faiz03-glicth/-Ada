import type { ActivityColorKey, ColorScheme } from '../types';

export const activityColors: Record<ColorScheme, Record<ActivityColorKey, string>> = {
  light: {
    green: '#1E9A52',
    orange: '#E8770F',
    purple: '#8B4FD8',
    blue: '#2F74D0',
    pink: '#D2457F',
    teal: '#12908E',
  },
  dark: {
    green: '#3DD68C',
    orange: '#FF9F43',
    purple: '#B685FF',
    blue: '#6AA8FF',
    pink: '#FF7FB0',
    teal: '#4FD6CF',
  },
};
