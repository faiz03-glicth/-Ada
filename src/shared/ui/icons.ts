import {
  Bell,
  Book,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Code,
  Droplet,
  Dumbbell,
  Flower2,
  Footprints,
  House,
  ListChecks,
  Lock,
  LogOut,
  Mail,
  Palette,
  Plus,
  Shield,
  Sparkles,
  Upload,
  User,
  type LucideIcon,
} from 'lucide-react-native';

/** The icons the app uses, by name. Named imports keep the bundle small. */
export const ICONS = {
  bell: Bell,
  book: Book,
  chart: ChartColumn,
  check: Check,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  alert: CircleAlert,
  code: Code,
  droplet: Droplet,
  dumbbell: Dumbbell,
  flower: Flower2,
  footprints: Footprints,
  house: House,
  list: ListChecks,
  lock: Lock,
  'log-out': LogOut,
  mail: Mail,
  palette: Palette,
  plus: Plus,
  shield: Shield,
  sparkles: Sparkles,
  upload: Upload,
  user: User,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function isIconName(name: string): name is IconName {
  return Object.hasOwn(ICONS, name);
}
