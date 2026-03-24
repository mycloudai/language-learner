import { computeDiff } from '../utils'

export default function DiffView({ input, target, isCorrect }: { input: string; target: string; isCorrect?: boolean }) {
  const { inputDiff, targetDiff } = computeDiff(input, target)

  const isMatch = isCorrect ?? input === target

  return (
    <div className="space-y-3">
      {isMatch ? (
        <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
          <span className="text-lg font-medium text-green-600 dark:text-green-400">✅ 完全正确！</span>
        </div>
      ) : (
        <>
          {/* User input with diff highlighting */}
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">你的输入：</div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50" style={{ fontFamily: "'Courier New', Consolas, monospace" }}>
              {inputDiff.map((d, i) => (
                <span
                  key={i}
                  className={
                    d.type === 'correct'
                      ? 'text-green-600 dark:text-green-400'
                      : d.type === 'wrong'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }
                >
                  {d.char === ' ' ? '\u00A0' : d.char}
                </span>
              ))}
            </div>
          </div>

          {/* Target with diff highlighting */}
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">正确答案：</div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50" style={{ fontFamily: "'Courier New', Consolas, monospace" }}>
              {targetDiff.map((d, i) => (
                <span
                  key={i}
                  className={
                    d.type === 'correct'
                      ? 'text-green-600 dark:text-green-400'
                      : d.type === 'wrong'
                      ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-red-100 text-red-600 line-through dark:bg-red-900/30 dark:text-red-400'
                  }
                >
                  {d.char === ' ' ? '\u00A0' : d.char}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>正确: {inputDiff.filter((d) => d.type === 'correct').length}</span>
            <span>错误: {inputDiff.filter((d) => d.type === 'wrong').length}</span>
            <span>多余: {inputDiff.filter((d) => d.type === 'extra').length}</span>
            <span>遗漏: {targetDiff.filter((d) => d.type === 'missing').length}</span>
          </div>
        </>
      )}
    </div>
  )
}
