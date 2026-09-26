// One file per icon: Metro doesn't tree-shake, so importing from the package root bundles all ~1,900 icons.
import Bell from 'lucide-react-native/icons/bell';
import Book from 'lucide-react-native/icons/book';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import Code from 'lucide-react-native/icons/code';
import Droplet from 'lucide-react-native/icons/droplet';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Flower2 from 'lucide-react-native/icons/flower-2';
import Footprints from 'lucide-react-native/icons/footprints';
import House from 'lucide-react-native/icons/house';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import Palette from 'lucide-react-native/icons/palette';
import Plus from 'lucide-react-native/icons/plus';
import Shield from 'lucide-react-native/icons/shield';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Upload from 'lucide-react-native/icons/upload';
import User from 'lucide-react-native/icons/user';
import Volume2 from 'lucide-react-native/icons/volume-2';

/** Every lucide icon has this type (taken from one, so the package root is never imported). */
type LucideIcon = typeof Bell;

/** The icons the app uses, by name. */
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
  volume: Volume2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function isIconName(name: string): name is IconName {
  return Object.hasOwn(ICONS, name);
}
