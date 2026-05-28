import { useState } from "react";
import MainSoundsScreen from "@/components/sound/MainSoundsScreen";
import CellSoundsScreen from "@/components/sound/CellSoundsScreen";

interface Props { onBack: () => void; }
type Section = "main" | "cells";

export default function SoundSettings({ onBack }: Props) {
  const [section, setSection] = useState<Section>("main");
  return section === "cells"
    ? <CellSoundsScreen onBack={() => setSection("main")} />
    : <MainSoundsScreen onBack={onBack} onCells={() => setSection("cells")} />;
}
