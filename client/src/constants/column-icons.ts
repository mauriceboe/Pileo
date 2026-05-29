import {
  Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark,
  Bell, Globe, Lightbulb, Shield, Check, CheckCircle,
  Clock, Eye, Home, Inbox, Layers, Mail, Map, Megaphone,
  Palette, Pencil, Play, Search, Send, Settings, Smile,
  Sparkles, ThumbsUp, TrendingUp, Upload, Users,
  type LucideIcon,
} from 'lucide-react';

export const COLUMN_ICON_MAP: Record<string, LucideIcon> = {
  check: Check, checkCircle: CheckCircle, star: Star, heart: Heart,
  thumbsUp: ThumbsUp, smile: Smile, sparkles: Sparkles, zap: Zap,
  rocket: Rocket, target: Target, flag: Flag, play: Play,
  trendingUp: TrendingUp, inbox: Inbox, layers: Layers, clock: Clock,
  eye: Eye, search: Search, pencil: Pencil, send: Send, upload: Upload,
  coffee: Coffee, sun: Sun, moon: Moon, cloud: Cloud, flame: Flame,
  music: Music, camera: Camera, gift: Gift, award: Award,
  bookmark: Bookmark, bell: Bell, globe: Globe, lightbulb: Lightbulb,
  shield: Shield, mail: Mail, map: Map, megaphone: Megaphone,
  palette: Palette, users: Users, home: Home, settings: Settings,
};

export const COLUMN_ICONS: Array<{ name: string; icon: LucideIcon }> =
  Object.entries(COLUMN_ICON_MAP).map(([name, icon]) => ({ name, icon }));
