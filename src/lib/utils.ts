import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5);
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  return cpf;
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  return cnpj;
}

export function getVestimentaLabel(vestimenta: string): string {
  const labels: Record<string, string> = {
    social: 'Social',
    casual: 'Casual',
    uniforme: 'Uniforme',
    esporte_fino: 'Esporte Fino',
    outro: 'Outro',
  };
  return labels[vestimenta] || vestimenta;
}

export function getMatchStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    aceito: 'Aceito',
    confirmado: 'Confirmado',
    recusado: 'Recusado',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };
  return labels[status] || status;
}

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskCPFouCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length <= 11 ? maskCPF(value) : maskCNPJ(value);
}

export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function getMatchStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aceito: 'bg-green-100 text-green-800',
    confirmado: 'bg-emerald-100 text-emerald-800',
    recusado: 'bg-red-100 text-red-800',
    concluido: 'bg-blue-100 text-blue-800',
    cancelado: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
