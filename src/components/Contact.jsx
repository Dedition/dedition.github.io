import { useEffect, useRef, useState } from "react";
import { profile } from "../constants";
import { Arrow, ExternalLink, Mark } from "./Icons";

export default function Contact() {
  const [copyStatus, setCopyStatus] = useState("");
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copyEmail() {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyStatus("Email copied.");
    } catch {
      setCopyStatus("Could not copy. You can select the email address above.");
    }
    timer.current = window.setTimeout(() => setCopyStatus(""), 5000);
  }

  return (
    <footer
      id="contact"
      className="contact-section"
      aria-labelledby="contact-heading"
    >
      <div className="shell">
        <div className="contact-top">
          <p className="eyebrow section-index">04 / START A CONVERSATION</p>
          <span className="contact-flower" aria-hidden="true">
            ✳
          </span>
        </div>
        <h2 id="contact-heading">
          Good things start
          <br />
          with <span className="serif-word">a hello.</span>
        </h2>
        <div className="contact-bottom">
          <div>
            <p>
              Have a role, a project, or an interesting problem?
              <br />
              I’d love to hear about it.
            </p>
            <a className="email-link" href={`mailto:${profile.email}`}>
              {profile.email}
              <Arrow diagonal />
            </a>
            <div className="copy-row">
              <button className="copy-button" type="button" onClick={copyEmail}>
                Copy email address
              </button>
              <span className="copy-status" role="status">
                {copyStatus}
              </span>
            </div>
          </div>
          <div className="contact-links">
            <ExternalLink href={profile.github}>GitHub</ExternalLink>
            <ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
            <a href={profile.resume} download>
              Résumé PDF
              <Arrow diagonal />
            </a>
          </div>
        </div>
        <div className="footer-line">
          <a
            href="#top"
            className="footer-identity"
            aria-label="Leo Ladipo, back to top"
          >
            <Mark />
            Leo Ladipo.
          </a>
          <span>Built with intention. Still curious.</span>
          <a href="#top">BACK TO TOP ↑</a>
        </div>
      </div>
    </footer>
  );
}
