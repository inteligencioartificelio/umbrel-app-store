import React from 'react';

/**
 * Shadcn UI Badge Primitive
 * Variants: default, secondary, gold, sky, destructive, outline
 */
export default function Badge({
  children,
  variant = 'default',
  className = '',
  icon: Icon,
  ...props
}) {
  const variantClass = `badge-${variant}`;

  return (
    <span className={`ui-badge ${variantClass} ${className}`} {...props}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}
