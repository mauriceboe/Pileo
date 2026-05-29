import {
  Layers, Folder, Briefcase, Rocket, Star, Zap, Target, Flag, Heart,
  Globe, Lightbulb, Code, Bug, Compass, Package, Puzzle, Feather, Flame,
  Award, Bookmark, Coffee, Sun, Moon, Cloud, Music, Camera, Gift, Bell,
  type LucideIcon,
} from 'lucide-react';

export const PROJECT_ICON_MAP: Record<string, LucideIcon> = {
  layers: Layers, folder: Folder, briefcase: Briefcase, rocket: Rocket,
  star: Star, zap: Zap, target: Target, flag: Flag, heart: Heart,
  globe: Globe, lightbulb: Lightbulb, code: Code, bug: Bug, compass: Compass,
  package: Package, puzzle: Puzzle, feather: Feather, flame: Flame,
  award: Award, bookmark: Bookmark, coffee: Coffee, sun: Sun, moon: Moon,
  cloud: Cloud, music: Music, camera: Camera, gift: Gift, bell: Bell,
};

export const PROJECT_ICONS: Array<{ name: string; icon: LucideIcon }> =
  Object.entries(PROJECT_ICON_MAP).map(([name, icon]) => ({ name, icon }));

export function getProjectIcon(iconName: string | null | undefined): LucideIcon {
  return (iconName && PROJECT_ICON_MAP[iconName]) || Layers;
}
