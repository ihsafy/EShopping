import { forwardRef } from 'react';

/**
 * The one button. `as` renders a router <Link> so navigation keeps the same
 * visual language and focus behaviour as a click target.
 */
const Button = forwardRef(function Button(
  {
    as: As = 'button',
    variant = 'secondary',
    size = 'md',
    block = false,
    loading = false,
    disabled = false,
    icon: Icon,
    iconEnd: IconEnd,
    className = '',
    children,
    type,
    ...rest
  },
  ref
) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    block && 'btn-block',
    !children && 'btn-icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <As
      ref={ref}
      className={classes}
      data-loading={loading ? 'true' : undefined}
      disabled={As === 'button' ? disabled || loading : undefined}
      aria-disabled={As !== 'button' && (disabled || loading) ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
      type={As === 'button' ? type || 'button' : undefined}
      {...rest}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children ? <span className="btn__label">{children}</span> : null}
      {IconEnd && !loading ? <IconEnd aria-hidden="true" /> : null}
    </As>
  );
});

export default Button;