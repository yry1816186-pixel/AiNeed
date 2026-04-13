// @ts-nocheck
import { hash } from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function generatePhone(index: number): string {
  const prefixes = ['138', '139', '136', '137', '158', '159', '188', '187'];
  const prefix = prefixes[index % prefixes.length];
  const suffix = String(index).padStart(8, '0').slice(-8);
  return prefix + suffix;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function generatePicsumUrl(seed: string, width: number = 800, height: number = 800): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
