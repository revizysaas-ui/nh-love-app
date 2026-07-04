"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";
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

const buttonVariants = {
  initial: { gap: 0, paddingLeft: ".5rem", paddingRight: ".5rem" },
  animate: (isSelected) => ({
    gap: isSelected ? ".5rem" : 0,
    paddingLeft: isSelected ? "1rem" : ".5rem",
    paddingRight: isSelected ? "1rem" : ".5rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.1, type: "spring", bounce: 0, duration: 0.6 };

export default function ExpandableTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState(() => {
    const idx = tabs.findIndex(t => t.path === location.pathname);
    return idx >= 0 ? idx : 0;
  });
  const ref = useRef(null);

  useOnClickOutside(ref, () => {});

  function handleSelect(index) {
    setSelected(index);
    navigate(tabs[index].path);
  }

  return (
    <div
      ref={ref}
      className="expandable-tabs"
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return (
          <motion.button
            key={tab.title}
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={selected === index}
            onClick={() => handleSelect(index)}
            transition={transition}
            className={`expandable-tab ${selected === index ? "selected" : ""}`}
          >
            <Icon size={20} />
            <AnimatePresence initial={false}>
              {selected === index && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="expandable-tab-label"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
