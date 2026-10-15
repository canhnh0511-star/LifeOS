import { BookOpen, Code2, Heart, Music2, Sparkles } from 'lucide-react';
import type { GoalCategory } from '../api/types';

export const categoryIcons: Record<GoalCategory, typeof Code2> = {
  CAREER: Code2, CREATIVITY: Music2, HEALTH: Heart, KNOWLEDGE: BookOpen, MINDFULNESS: Sparkles
};
export const categoryColors: Record<GoalCategory, string> = {
  CAREER: 'blue', CREATIVITY: 'purple', HEALTH: 'orange', KNOWLEDGE: 'green', MINDFULNESS: 'pink'
};
