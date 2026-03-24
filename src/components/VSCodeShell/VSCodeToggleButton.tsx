import { isVSCodeModeAtom } from '@/store/vscodeMode'
import { useSetAtom } from 'jotai'

export default function VSCodeToggleButton() {
  const setVSCodeMode = useSetAtom(isVSCodeModeAtom)

  return (
    <button className="vsc-toggle-btn" onClick={() => setVSCodeMode(true)} title="Switch to VS Code mode">
      <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
        <mask id="a" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <path
            d="M180.828 252.605a15.872 15.872 0 0 0 12.65-.486l52.501-25.262a15.94 15.94 0 0 0 9.025-14.364V43.508a15.939 15.939 0 0 0-9.025-14.363L193.477 3.882a15.885 15.885 0 0 0-18.142 3.106L80.18 90.24l-44.013-33.41a10.627 10.627 0 0 0-13.593.598L3.305 74.941a10.625 10.625 0 0 0-.005 15.593l38.708 35.469-38.708 35.468a10.622 10.622 0 0 0 .005 15.592l19.27 17.515a10.627 10.627 0 0 0 13.592.597L80.18 161.76l95.156 83.253a15.895 15.895 0 0 0 5.492 7.592z"
            fill="#fff"
          />
        </mask>
        <g mask="url(#a)">
          <path
            d="M246.135 26.873 193.593 3.882a15.885 15.885 0 0 0-18.142 3.106L80.18 90.24l-44.013-33.41a10.627 10.627 0 0 0-13.593.598L3.305 74.941a10.625 10.625 0 0 0-.005 15.593l38.708 35.469-38.708 35.468a10.622 10.622 0 0 0 .005 15.592l19.27 17.515a10.627 10.627 0 0 0 13.592.597L80.18 161.76l95.272 83.253a15.875 15.875 0 0 0 18.142 3.106l52.5-25.262a15.94 15.94 0 0 0 9.025-14.364V41.236a15.94 15.94 0 0 0-8.984-14.363z"
            fill="#0065A9"
          />
          <g filter="url(#b)">
            <path
              d="M246.135 26.873 193.593 3.882a15.885 15.885 0 0 0-18.142 3.106L80.18 90.24l-44.013-33.41a10.627 10.627 0 0 0-13.593.598L3.305 74.941a10.625 10.625 0 0 0-.005 15.593l38.708 35.469-38.708 35.468a10.622 10.622 0 0 0 .005 15.592l19.27 17.515a10.627 10.627 0 0 0 13.592.597L80.18 161.76l95.272 83.253a15.875 15.875 0 0 0 18.142 3.106l52.5-25.262a15.94 15.94 0 0 0 9.025-14.364V41.236a15.94 15.94 0 0 0-8.984-14.363z"
              fill="url(#c)"
            />
          </g>
          <g filter="url(#d)">
            <path
              d="M193.478 252.118a15.886 15.886 0 0 1-18.142-3.106L80.18 165.76l-44.013 33.41a10.627 10.627 0 0 1-13.593-.597L3.305 181.059a10.625 10.625 0 0 1-.005-15.593l38.708-35.468-38.708-35.469a10.625 10.625 0 0 1 .005-15.593l19.27-17.513a10.627 10.627 0 0 1 13.592-.598l44.013 33.41 95.156-83.252a15.885 15.885 0 0 1 18.142-3.106l52.542 25.263a15.94 15.94 0 0 1 9.025 14.363v169.985a15.94 15.94 0 0 1-9.025 14.364l-52.542 25.262z"
              fill="url(#e)"
            />
          </g>
          <g filter="url(#f)">
            <path
              d="M193.478 3.882a15.886 15.886 0 0 0-18.142 3.106l-.457.468c6.517 6.517 9.835 15.86 9.835 14.363v103.684l50.29-40.775V41.236a15.93 15.93 0 0 0-8.984-14.363L193.478 3.882z"
              fill="url(#g)"
              fillOpacity=".25"
            />
          </g>
        </g>
        <defs>
          <filter
            id="b"
            x="-21.49"
            y="-20.237"
            width="298.822"
            height="296.474"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset />
            <feGaussianBlur stdDeviation="10.959" />
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <linearGradient id="c" x1="127.844" y1="0.66" x2="127.844" y2="255.34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity=".1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter
            id="d"
            x="-21.49"
            y="-20.237"
            width="298.822"
            height="296.474"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset />
            <feGaussianBlur stdDeviation="10.959" />
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <linearGradient id="e" x1="127.844" y1="255.34" x2="127.844" y2="0.66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" stopOpacity=".1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter
            id="f"
            x="152.96"
            y="-18.04"
            width="124.344"
            height="164.082"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
            <feOffset />
            <feGaussianBlur stdDeviation="10.959" />
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <linearGradient id="g" x1="175.002" y1="0.66" x2="175.002" y2="125.503" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  )
}
