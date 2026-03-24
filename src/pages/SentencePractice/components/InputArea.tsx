import useSentenceKeySounds from '@/hooks/useSentenceKeySounds'
import { useCallback, useEffect, useRef } from 'react'

export default function InputArea({
  disabled,
  value,
  onChange,
  onSubmit,
  sentence,
}: {
  disabled: boolean
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  sentence: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [playKeySound] = useSentenceKeySounds()

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled, sentence])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (value.trim()) {
          onSubmit()
        }
      }
    },
    [value, onSubmit],
  )

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          // Play key click sound on actual character input (not delete/etc)
          const native = e.nativeEvent as InputEvent
          if (native.inputType === 'insertText' || native.inputType === 'insertCompositionText') {
            playKeySound()
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? '请等待句子生成...' : '输入句子后按 Enter 提交'}
        rows={3}
        className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-lg tracking-wide outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400"
        style={{ fontFamily: "'Courier New', Consolas, monospace" }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      <div className="absolute bottom-3 right-3 text-xs text-gray-400">Enter 提交</div>
    </div>
  )
}
