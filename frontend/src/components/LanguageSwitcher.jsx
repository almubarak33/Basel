import React from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';
import s from './LanguageSwitcher.module.css';

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const toggle = () => setLanguage(current === 'ar' ? 'en' : 'ar');

  if (compact) {
    return (
      <button className={s.compact} onClick={toggle} title="Switch language">
        {current === 'ar' ? 'EN' : 'ع'}
      </button>
    );
  }

  return (
    <div className={s.wrap}>
      <button
        className={`${s.btn} ${current === 'ar' ? s.active : ''}`}
        onClick={() => setLanguage('ar')}
      >
        العربية
      </button>
      <button
        className={`${s.btn} ${current === 'en' ? s.active : ''}`}
        onClick={() => setLanguage('en')}
      >
        English
      </button>
    </div>
  );
}
