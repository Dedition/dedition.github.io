import { useEffect, useRef, useState } from "react";
import { navigation, profile } from "../constants";
import { Arrow, Mark } from "./Icons";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const header = useRef(null);
  const toggle = useRef(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const closeOutside = (event) => {
      if (!header.current?.contains(event.target)) setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return (
    <header className="site-header" ref={header}>
      <div className="header-inner">
        <a
          className="identity"
          href="#top"
          aria-label="Leo Ladipo, back to top"
          onClick={() => setOpen(false)}
        >
          <Mark />
          <span>
            Leo Ladipo<span className="identity-dot">.</span>
          </span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          ref={toggle}
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        <nav
          id="site-navigation"
          aria-label="Main navigation"
          className={open ? "navigation is-open" : "navigation"}
        >
          {navigation.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <a
            className="nav-resume"
            href={profile.resume}
            target="_blank"
            rel="noopener noreferrer"
          >
            Résumé
            <Arrow diagonal />
            <span className="sr-only"> PDF, opens in a new tab</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
