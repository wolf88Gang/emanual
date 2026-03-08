import React from 'react';

interface HGLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
}

export function HGLogo({ className = '', size = 'md', variant = 'dark' }: HGLogoProps) {
  const sizeMap = { sm: 'w-12 h-12', md: 'w-20 h-20', lg: 'w-32 h-32' };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div className={`${sizeMap[size]} relative`}>
        <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-xl scale-125" />
        <img
          src="/images/hg-logo.png"
          alt="HG"
          className={`relative w-full h-full object-contain drop-shadow-lg ${variant === 'light' ? 'invert brightness-200' : ''}`}
        />
      </div>
    </div>
  );
}
