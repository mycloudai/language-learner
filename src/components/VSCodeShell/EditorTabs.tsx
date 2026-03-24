export default function EditorTabs({
  activeFile,
  openFiles,
  onSelectFile,
}: {
  activeFile: string
  openFiles: string[]
  onSelectFile: (name: string) => void
}) {
  return (
    <div className="vsc-tabs">
      {openFiles.map((file) => (
        <div key={file} className={`vsc-tab ${activeFile === file ? 'vsc-tab--active' : ''}`} onClick={() => onSelectFile(file)}>
          <span style={{ color: '#3178c6', fontSize: 11, fontWeight: 700 }}>TS</span>
          <span>{file}</span>
          <span className="vsc-tab-close">×</span>
        </div>
      ))}
    </div>
  )
}
