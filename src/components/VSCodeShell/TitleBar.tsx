export default function TitleBar({ filename }: { filename: string }) {
  return (
    <div className="vsc-titlebar">
      <div className="vsc-traffic-lights">
        <span className="vsc-traffic-light vsc-traffic-light--close" />
        <span className="vsc-traffic-light vsc-traffic-light--minimize" />
        <span className="vsc-traffic-light vsc-traffic-light--maximize" />
      </div>
      <span className="vsc-titlebar-text">{filename} — vocabulary-trainer — Visual Studio Code</span>
    </div>
  )
}
