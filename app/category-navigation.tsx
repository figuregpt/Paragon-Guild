'use client';

import { BookOpen, Map, Shield, Timer } from 'lucide-react';
import { useLanguage } from './language-provider';
import { t } from '@/lib/i18n';
import './category-navigation.css';

const categories = [
  { id: 'guild', label: 'Guild', view: 'home', icon: Shield },
  { id: 'guide', label: 'Guide', view: 'guide', icon: Map },
  { id: 'recipes', label: 'Recipes', view: 'recipes', icon: BookOpen },
  { id: 'tools', label: 'Tools', view: 'tools', icon: Timer },
] as const;

export type AppCategory = (typeof categories)[number]['id'];

type CategoryNavigationProps = {
  active: AppCategory;
  onSelect: (category: AppCategory) => void;
};

export default function CategoryNavigation({ active, onSelect }: CategoryNavigationProps) {
  useLanguage();

  return (
    <nav className="pg-category-nav" aria-label={t('Main navigation')}>
      {categories.map(({ id, label, view, icon: Icon }) => (
        <a
          key={id}
          href={'/?view=' + view}
          data-category={id}
          aria-current={active === id ? 'page' : undefined}
          onClick={(event) => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onSelect(id);
          }}
        >
          <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
          <span>{t(label)}</span>
        </a>
      ))}
    </nav>
  );
}
