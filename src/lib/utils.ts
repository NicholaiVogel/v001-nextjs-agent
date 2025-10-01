import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  FileCode2,
  FileJson,
  FileLock2,
  FileText,
  FileType2,
  ImageIcon,
  type LucideIcon,
} from 'lucide-react';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getFileIcon(filename: string): LucideIcon {
  if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) {
    return FileType2;
  }
  if (filename.endsWith('.ts') || filename.endsWith('.js')) {
    return FileCode2;
  }
  if (filename.endsWith('.json')) {
    return FileJson;
  }
  if (filename.endsWith('.css') || filename.endsWith('.md')) {
    return FileText;
  }
  if (filename.endsWith('.lock')) {
    return FileLock2;
  }
  if (
    filename.endsWith('.png') ||
    filename.endsWith('.jpg') ||
    filename.endsWith('.jpeg') ||
    filename.endsWith('.gif') ||
    filename.endsWith('.svg')
  ) {
    return ImageIcon;
  }
  return FileText;
}