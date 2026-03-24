import type { PlayFunction } from './useKeySounds'
import { KEY_SOUND_URL_PREFIX, SOUND_URL_PREFIX, keySoundResources } from '@/resources/soundResource'
import { sentenceHintSoundsConfigAtom, sentenceKeySoundsConfigAtom } from '@/store'
import noop from '@/utils/noop'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import useSound from 'use-sound'

/** Same signature as useKeySounds but reads from sentence-specific atoms. */
export default function useSentenceKeySounds(): [PlayFunction, PlayFunction, PlayFunction] {
  const { isOpen: isKeyOpen, isOpenClickSound, volume: keyVolume, resource: keyResource } = useAtomValue(sentenceKeySoundsConfigAtom)
  const setKeySoundsConfig = useSetAtom(sentenceKeySoundsConfigAtom)
  const {
    isOpen: isHintOpen,
    isOpenWrongSound,
    isOpenCorrectSound,
    volume: hintVolume,
    wrongResource,
    correctResource,
  } = useAtomValue(sentenceHintSoundsConfigAtom)
  // Compute URL directly so it updates reactively when the resource atom changes.
  // Guard against stale/invalid resources by falling back to the default.
  const validResource = keySoundResources.some((item) => item.filename === keyResource.filename && item.key === keyResource.key)
    ? keyResource
    : keySoundResources.find((item) => item.key === 'Default') ?? keySoundResources[0]

  useEffect(() => {
    if (!keySoundResources.some((item) => item.filename === keyResource.filename && item.key === keyResource.key)) {
      const defaultKeySoundResource = keySoundResources.find((item) => item.key === 'Default') || keySoundResources[0]
      setKeySoundsConfig((prev) => ({ ...prev, resource: defaultKeySoundResource }))
    }
  }, [keyResource, setKeySoundsConfig])

  const [playClickSound] = useSound(`${KEY_SOUND_URL_PREFIX}${validResource.filename}`, { volume: keyVolume, interrupt: true })
  const [playWrongSound] = useSound(`${SOUND_URL_PREFIX}${wrongResource.filename}`, { volume: hintVolume, interrupt: true })
  const [playCorrectSound] = useSound(`${SOUND_URL_PREFIX}${correctResource.filename}`, { volume: hintVolume, interrupt: true })

  return [
    isKeyOpen && isOpenClickSound ? playClickSound : noop,
    isHintOpen && isOpenWrongSound ? playWrongSound : noop,
    isHintOpen && isOpenCorrectSound ? playCorrectSound : noop,
  ]
}
