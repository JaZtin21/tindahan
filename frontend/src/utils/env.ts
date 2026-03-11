export function env(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key]
}

