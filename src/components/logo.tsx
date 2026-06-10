'use client';

import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'color';
  showText?: boolean;
  href?: string;
  className?: string;
}

const sizes = {
  sm: { width: 32, height: 32 },
  md: { width: 40, height: 40 },
  lg: { width: 48, height: 48 },
  xl: { width: 64, height: 64 },
};

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export default function Logo({ 
  size = 'md', 
  variant = 'color', 
  showText = true, 
  href,
  className = '' 
}: LogoProps) {
  const { width, height } = sizes[size];
  const textSize = textSizes[size];
  
  // Logo container com fundo apropriado
  const bgClass = variant === 'light' 
    ? 'bg-white' 
    : variant === 'dark' 
      ? 'bg-brand-600' 
      : 'bg-white';
  
  const textClass = variant === 'light' 
    ? 'text-brand-600' 
    : variant === 'dark' 
      ? 'text-white' 
      : 'text-brand-600';

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${bgClass} rounded-lg flex items-center justify-center overflow-hidden`} style={{ width, height }}>
        <Image
          src="/logo.png"
          alt="JOBBPRO"
          width={width}
          height={height}
          className="object-contain w-full h-full"
          priority
        />
      </div>
      {showText && (
        <span className={`font-bold ${textSize} ${textClass}`}>
          JOBBPRO
        </span>
      )}
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

// Versão simplificada só com a imagem
export function LogoIcon({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const { width, height } = sizes[size];
  
  return (
    <div className={`rounded-lg overflow-hidden ${className}`} style={{ width, height }}>
      <Image
        src="/logo.png"
        alt="JOBBPRO"
        width={width}
        height={height}
        className="object-contain w-full h-full"
        priority
      />
    </div>
  );
}
