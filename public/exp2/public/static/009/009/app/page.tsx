import { TextAnimate } from "../components/TextAnimate"
import "./globals.css"

export default function Home() {
  return (
    <div className="text-block">
      <TextAnimate animation="blurInUp" by="character">
        Intelligence
      </TextAnimate>
    </div>
  )
} 