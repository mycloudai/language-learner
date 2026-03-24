import logo from '@/assets/mycloudai-logo.png'
import type { PropsWithChildren } from 'react'
import type React from 'react'
import { NavLink } from 'react-router-dom'

const Header: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <header className="vsc-typing-header container z-20 mx-auto w-full px-10 py-6">
      <div className="flex w-full flex-col items-center justify-between space-y-3 lg:flex-row lg:space-y-0">
        <NavLink className="flex items-center text-2xl font-bold text-indigo-500 no-underline hover:no-underline lg:text-4xl" to="/">
          <img src={logo} className="mr-3 h-16 w-16" alt="MyCloudAI Learner Logo" />
          <h1>MyCloudAI Learner</h1>
        </NavLink>
        <nav className="my-card on element flex w-auto content-center items-center justify-end space-x-3 rounded-xl bg-white p-4 transition-colors duration-300 dark:bg-gray-800">
          <NavLink
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400'
              }`
            }
            to="/sentence-practice"
            title="AI 驱动的句子练习模式"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="8" width="18" height="12" rx="2" />
              <path d="M9 12h.01M15 12h.01M9 16h6" />
              <path d="M12 4v4" />
              <circle cx="12" cy="3" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            AI 句子练习
          </NavLink>
          {children}
        </nav>
      </div>
    </header>
  )
}

export default Header
