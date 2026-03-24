import { TypingContext, TypingStateActionType } from '../../store'
import AdvancedSetting from './AdvancedSetting'
import SentenceModeSetting from './SentenceModeSetting'
import SentenceSoundSetting from './SentenceSoundSetting'
import SoundSetting from './SoundSetting'
import { AISettingsSection, DataManagementSection } from '@/components/UnifiedSettingsPanel'
import ViewSetting from '@/pages/Typing/components/Setting/ViewSetting'
import { typingSettingsOpenAtom } from '@/store/uiState'
import { Dialog, Tab, Transition } from '@headlessui/react'
import classNames from 'classnames'
import { useAtom } from 'jotai'
import { Fragment, useContext, useEffect } from 'react'
import IconCog6Tooth from '~icons/heroicons/cog-6-tooth-solid'
import IconDatabaseCog from '~icons/tabler/database-cog'
import IconMessageChatbot from '~icons/tabler/message-chatbot'
import IconX from '~icons/tabler/x'

interface SettingProps {
  showTrigger?: boolean
  showDialog?: boolean
}

export default function Setting({ showTrigger = true, showDialog = true }: SettingProps) {
  const [isOpen, setIsOpen] = useAtom(typingSettingsOpenAtom)
  const { dispatch } = useContext(TypingContext) ?? {}

  function closeModal() {
    setIsOpen(false)
  }

  function openModal() {
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen || !dispatch) return
    dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
  }, [isOpen, dispatch])

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={openModal}
          className={`flex items-center justify-center rounded p-[2px] text-lg text-indigo-500 outline-none transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white  ${
            isOpen && 'bg-indigo-500 text-white'
          }`}
          title="打开设置对话框"
        >
          <IconCog6Tooth className="icon" />
        </button>
      )}

      {showDialog && (
        <Transition appear show={isOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={closeModal}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="flex w-200 flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-xl dark:bg-gray-800">
                    <div className="relative flex h-22 items-end justify-between rounded-t-lg border-b border-neutral-100 bg-stone-50 px-6 py-3 dark:border-neutral-700 dark:bg-gray-900">
                      <span className="text-3xl font-bold text-gray-600">设置</span>
                      <button type="button" onClick={() => setIsOpen(false)} title="关闭对话框">
                        <IconX className="absolute right-7 top-5 cursor-pointer text-gray-400" />
                      </button>
                    </div>

                    <Tab.Group vertical>
                      <div className="flex h-120 w-full ">
                        <Tab.List className="flex h-full w-52 flex-col items-start space-y-3 border-r border-neutral-100 bg-stone-50 px-6 py-3 dark:border-transparent dark:bg-gray-900">
                          <Tab
                            className={({ selected }) =>
                              classNames(
                                'flex h-14 w-full cursor-pointer items-center gap-2 rounded-lg px-4 py-2 ring-0 focus:outline-none',
                                selected && 'bg-gray-200 bg-opacity-50 dark:bg-gray-800',
                              )
                            }
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="mr-2 text-neutral-500 dark:text-neutral-300"
                            >
                              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span className="text-neutral-500 dark:text-neutral-300">单词设置</span>
                          </Tab>
                          <Tab
                            className={({ selected }) =>
                              classNames(
                                'flex h-14 w-full cursor-pointer items-center gap-2 rounded-lg px-4 py-2 ring-0 focus:outline-none',
                                selected && 'bg-gray-200 bg-opacity-50 dark:bg-gray-800',
                              )
                            }
                          >
                            <IconMessageChatbot className="mr-2 text-neutral-500 dark:text-neutral-300" />
                            <span className="text-neutral-500 dark:text-neutral-300">句子设置</span>
                          </Tab>
                          <Tab
                            className={({ selected }) =>
                              classNames(
                                'flex h-14 w-full cursor-pointer items-center gap-2 rounded-lg px-4 py-2 ring-0 focus:outline-none',
                                selected && 'bg-gray-200 bg-opacity-50 dark:bg-gray-800',
                              )
                            }
                          >
                            <IconDatabaseCog className="mr-2 text-neutral-500 dark:text-neutral-300" />
                            <span className="text-neutral-500 dark:text-neutral-300">数据管理</span>
                          </Tab>
                        </Tab.List>

                        <Tab.Panels className="h-full w-full flex-1 overflow-y-auto">
                          <Tab.Panel className="flex h-full w-full focus:outline-none">
                            <Tab.Group>
                              <div className="flex h-full w-full flex-col">
                                <Tab.List className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
                                  {['音效', '高级', '显示'].map((name) => (
                                    <Tab
                                      key={name}
                                      className={({ selected }) =>
                                        classNames(
                                          'rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 focus:outline-none dark:text-neutral-300',
                                          selected && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                                        )
                                      }
                                    >
                                      {name}
                                    </Tab>
                                  ))}
                                </Tab.List>
                                <Tab.Panels className="flex h-full w-full overflow-y-auto">
                                  <Tab.Panel className="flex h-full w-full focus:outline-none">
                                    <SoundSetting />
                                  </Tab.Panel>
                                  <Tab.Panel className="flex h-full w-full focus:outline-none">
                                    <AdvancedSetting />
                                  </Tab.Panel>
                                  <Tab.Panel className="flex h-full w-full focus:outline-none">
                                    <ViewSetting />
                                  </Tab.Panel>
                                </Tab.Panels>
                              </div>
                            </Tab.Group>
                          </Tab.Panel>
                          <Tab.Panel className="flex h-full focus:outline-none">
                            <Tab.Group>
                              <div className="flex h-full w-full flex-col">
                                <Tab.List className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-700">
                                  {['音效', '高级', 'AI 配置'].map((name) => (
                                    <Tab
                                      key={name}
                                      className={({ selected }) =>
                                        classNames(
                                          'rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 focus:outline-none dark:text-neutral-300',
                                          selected && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
                                        )
                                      }
                                    >
                                      {name}
                                    </Tab>
                                  ))}
                                </Tab.List>
                                <Tab.Panels className="flex h-full w-full overflow-y-auto">
                                  <Tab.Panel className="flex h-full w-full focus:outline-none">
                                    <SentenceSoundSetting />
                                  </Tab.Panel>
                                  <Tab.Panel className="flex h-full w-full focus:outline-none">
                                    <SentenceModeSetting />
                                  </Tab.Panel>
                                  <Tab.Panel className="flex h-full w-full focus:outline-none">
                                    <AISettingsSection />
                                  </Tab.Panel>
                                </Tab.Panels>
                              </div>
                            </Tab.Group>
                          </Tab.Panel>
                          <Tab.Panel className="flex h-full focus:outline-none">
                            <DataManagementSection />
                          </Tab.Panel>
                        </Tab.Panels>
                      </div>
                    </Tab.Group>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}
    </>
  )
}
