import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

interface LanguageSwitcherProps {
  size?: 'small' | 'middle' | 'large';
  showIcon?: boolean;
  style?: React.CSSProperties;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  size = 'middle',
  showIcon = true,
  style,
}) => {
  const { i18n } = useTranslation();

  const languages = [
    {
      code: 'ko',
      name: '한국어',
      flag: '🇰🇷',
    },
    {
      code: 'en',
      name: 'English',
      flag: '🇺🇸',
    },
  ];

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <Select
      value={i18n.language}
      onChange={handleLanguageChange}
      size={size}
      style={{ minWidth: showIcon ? 120 : 100, ...style }}
      suffixIcon={showIcon ? <GlobalOutlined /> : undefined}
    >
      {languages.map((language) => (
        <Option key={language.code} value={language.code}>
          <Space>
            <span>{language.flag}</span>
            <span>{language.name}</span>
          </Space>
        </Option>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;