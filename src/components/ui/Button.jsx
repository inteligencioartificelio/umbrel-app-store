import React from 'react';

/**
 * Nano Banana Studio UI Button Primitive
 * Variants: default, primary, secondary, outline, ghost, gold, destructive
 * Sizes: sm, md, lg, icon
 */
export default function Button({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  title,
  icon: Icon,
  ...props
}) {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const loadingClass = loading ? 'btn-loading' : '';

  return (
    <button
      type={type}
      className={`ui-btn ${variantClass} ${sizeClass} ${loadingClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      {...props}
    >
      {Icon && (
        <Icon
          size={size === 'sm' ? 13 : size === 'lg' ? 18 : 15}
          className={loading ? 'ui-icon-spin' : ''}
        />
      )}
      {children}
    </button>
  );
}
