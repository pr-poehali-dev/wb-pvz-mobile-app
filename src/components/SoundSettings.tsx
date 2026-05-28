import { useState } from "react";
import MainSoundsScreen from "@/components/sound/MainSoundsScreen";
import CellSoundsScreen from "@/components/sound/CellSoundsScreen";
import QtySoundsScreen from "@/components/sound/QtySoundsScreen";

interface Props { onBack: () => void; }
type Section = "main" | "cells" | "qty";

export default function SoundSettings({ onBack }: Props) {
  const [section, setSection] = useState<Section>("main");

  if (section === "cells") return <CellSoundsScreen onBack={() => setSection("main")} />;
  if (section === "qty")   return <QtySoundsScreen  onBack={() => setSection("main")} />;

  return (
    <MainSoundsScreen
      onBack={onBack}
      onCells={() => setSection("cells")}
      onQty={() => setSection("qty")}
    />
  );
}
