/** 유튜브 영상 → 연습 재료. 한 번 연 영상은 저장해 두어 다시 열 때 자막 한도를 쓰지 않는다. */
import { buildDraftMaterial } from '../engine/import/material'
import { cleanCues } from '../engine/import/parse'
import type { Lang } from '../engine/lang'
import type { Material } from '../engine/types'
import { getTranscript } from './api'
import { loadSegmenter } from './segmenter'
import type { Store } from './storage'

/** 영상 재료 id: `<lang>-y<videoId>` (같은 영상은 같은 재료) */
export const videoMaterialId = (lang: Lang, videoId: string) => `${lang}-y${videoId}`

export async function openVideo(
  store: Store,
  lang: Lang,
  videoId: string,
  meta?: { title: string; channel: string; durationSec: number; thumbnail: string },
): Promise<Material> {
  const id = videoMaterialId(lang, videoId)
  const existing = await store.getMaterial(id)
  if (existing) return existing

  const t = await getTranscript(lang, videoId)
  const segment = await loadSegmenter(lang).catch(() => null)
  const draft = buildDraftMaterial({ id, lang, title: meta?.title ?? `유튜브 영상 ${videoId}`, lines: cleanCues(t.lines), segment, youtubeId: videoId })
  const material: Material = { ...draft, kind: 'youtube', koSource: t.koSource === 'none' ? 'none' : t.koSource, source: t.source }
  await store.saveMaterial(material)
  return material
}
