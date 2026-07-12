import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Image, MapPin, PenLine, Gamepad2 } from "lucide-react";

const tabs = [
  { title: "Accueil", icon: Heart, path: "/" },
  { title: "Msg", icon: MessageCircle, path: "/messages" },
  { title: "Galerie", icon: Image, path: "/galerie" },
  { title: "Carte", icon: MapPin, path: "/carte" },
  { title: "Dessin", icon: PenLine, path: "/dessin" },
  { title: "Jeux", icon: Gamepad2, path: "/jeux" },
];

export default function ExpandableTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(() => {
    const idx = tabs.findIndex(t => t.path === location.pathname);
    return idx >= 0 ? idx : 0;
  });
  const scrollRef = useRef(null);

  function handleSelect(index) {
    setSelected(index);
    navigate(tabs[index].path);
  }

  return (
    <div ref={scrollRef} className="expandable-tabs">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isSelected = selected === index;
        return (
          <button
            key={tab.title}
            onClick={() => handleSelect(index)}
            className={`expandable-tab ${isSelected ? "selected" : ""}`}
            style={{ gap: isSelected ? "0.5rem" : "0" }}
          >
            <Icon size={24} />
            {isSelected && <span className="expandable-tab-label">{tab.title}</span>}
          </button>
        );
      })}
    </div>
  );
}
