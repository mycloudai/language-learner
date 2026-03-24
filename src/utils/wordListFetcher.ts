import type { Word } from '@/typings'

export async function wordListFetcher(url: string): Promise<Word[]> {
  // Use BASE_URL so dict files resolve correctly on sub-path deployments (e.g. GitHub Pages /language-learner/)
  const response = await fetch(import.meta.env.BASE_URL + url.replace(/^\//, ''))
  const words: Word[] = await response.json()
  return words
}
