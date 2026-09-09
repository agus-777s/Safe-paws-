export function clases(...partes: Array<string | false | null | undefined>): string {
  return partes.filter(Boolean).join(' ')
}