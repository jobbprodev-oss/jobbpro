'use client';

import Link from 'next/link';
import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
  showText?: boolean;
  href?: string;
  className?: string;
}

// Dimensões proporcionais ao viewBox 280x80 do SVG (razão 3.5:1)
const sizes = {
  sm: { width: 140, height: 40 },
  md: { width: 175, height: 50 },
  lg: { width: 210, height: 60 },
  xl: { width: 280, height: 80 },
};

const textSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

const iconSizes = {
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72,
};

export default function Logo({ 
  size = 'md', 
  variant = 'color', 
  showText = false, 
  href,
  className = '' 
}: LogoProps) {
  const { width } = sizes[size];
  const [imgSrc, setImgSrc] = useState('/logo.jpeg');

  // Em fundo escuro: container branco arredondado para a logo ficar legível
  const wrapperClass = variant === 'dark'
    ? 'bg-white rounded-xl px-3 py-2 inline-flex items-center'
    : 'inline-flex items-center';

  const content = (
    <div className={`${wrapperClass} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt="JOBBPRO"
        width={width}
        height="auto"
        style={{ width, height: 'auto', display: 'block' }}
        className="object-contain"
        onError={() => { if (imgSrc === '/logo.jpeg') setImgSrc('/logo.svg'); }}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}

// Versão para uso no header interno — logo retangular com altura fixa
export function LogoIcon({ size = 'md', variant = 'color', href, className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; variant?: 'light' | 'dark' | 'color'; href?: string; className?: string }) {
  const px = iconSizes[size];
  const [imgSrc, setImgSrc] = useState('/logo.jpeg');

  const content = (
    <div className={`inline-flex items-center ${className}`} style={{ height: px }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt="JOBBPRO"
        height={px}
        style={{ height: px, width: 'auto', display: 'block' }}
        className="object-contain"
        onError={() => { if (imgSrc === '/logo.jpeg') setImgSrc('/logo.svg'); }}
      />
    </div>
  );

  if (href) {
    return <Link href={href} className="inline-block">{content}</Link>;
  }

  return content;
}
