import { FiCheck, FiMoon, FiSun } from 'react-icons/fi';
import useTheme from '../../context/useTheme';
import { THEME_OPTIONS } from '../../context/ThemeContext';

/**
 * Light / Dark / System switch.
 * Rendered as a three-item radio group so keyboard and screen-reader users get
 * the real choice rather than a cycling button they cannot predict.
 */
export default function ThemeToggle({ variant = 'menu', className = '' }) {
  const { preference, isDark, setTheme } = useTheme();

  if (variant === 'menu') {
    return (
      <div className={`theme-menu ${className}`.trim()} role="radiogroup" aria-label="Colour theme">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.value === 'light' ? FiSun : option.value === 'dark' ? FiMoon : FiCheck;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={preference === option.value}
              className="theme-menu__item"
              onClick={() => setTheme(option.value)}
            >
              <Icon aria-hidden="true" />
              <span>{option.label}</span>
              {preference === option.value ? <span className="sr-only">(selected)</span> : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`icon-btn ${className}`.trim()}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Theme: ${preference}`}
      data-theme-state={preference}
    >
      {isDark ? <FiMoon className="icon-btn__icon" aria-hidden="true" /> : <FiSun className="icon-btn__icon" aria-hidden="true" />}
    </button>
  );
}