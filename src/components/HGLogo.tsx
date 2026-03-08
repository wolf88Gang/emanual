import React from 'react';

interface HGLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
}

export function HGLogo({ className = '', size = 'md', variant = 'dark' }: HGLogoProps) {
  const sizeMap = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-20 h-20' };

  return (
    <img
      src="/images/hg-logo.png"
      alt="HG"
      className={`${sizeMap[size]} object-contain ${variant === 'light' ? 'invert brightness-200' : ''} ${className}`}
    />
  );
}
