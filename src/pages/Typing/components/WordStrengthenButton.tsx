import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import IconTargetArrow from '~icons/tabler/target-arrow'

const WordStrengthenButton = () => {
  const navigate = useNavigate()

  const toStrengthen = useCallback(() => {
    navigate('/word-strengthen')
  }, [navigate])

  return (
    <button
      type="button"
      onClick={toStrengthen}
      className="flex items-center justify-center rounded p-[2px] text-lg text-orange-500 outline-none transition-colors duration-300 ease-in-out hover:bg-orange-400 hover:text-white"
      title="进入错误练习"
    >
      <IconTargetArrow className="icon" />
    </button>
  )
}

export default WordStrengthenButton
