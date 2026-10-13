import { profile } from "../constants";
import { Arrow, ExternalLink } from "./Icons";

export default function Works() {
  return (
    <section
      className="work-section shell section-space"
      id="work"
      aria-labelledby="work-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow section-index">01 / SELECTED WORK</p>
          <h2 id="work-heading">
            Built with <span className="serif-word">intent.</span>
          </h2>
        </div>
        <p>
          A product of my own.
          <br />
          Systems that serve other people.
          <br />
          The details that make both work.
        </p>
      </div>
      <div className="work-grid">
        <article className="project project-inbalance">
          <div className="project-visual inbalance-visual">
            <div className="project-visual-top">
              <span>INDEPENDENT PRODUCT</span>
              <span>01 — MOBILE + BACKEND</span>
            </div>
            <div className="inbalance-art-copy">
              <span className="inbalance-symbol" aria-hidden="true">
                iB<span>↗</span>
              </span>
              <h3>
                Less guesswork.
                <br />
                One next action.
              </h3>
              <span className="visual-footnote">
                INBALANCE / PRODUCT SCREENSHOT
              </span>
            </div>
            <div className="phone-frame">
              <img
                src="/images/inbalance-next-action.png"
                alt="InBalance’s next-action screen, showing an example tax payment, due date, and payment-recording controls"
                width="540"
                height="1200"
                loading="lazy"
              />
            </div>
          </div>
          <div className="project-body">
            <div className="project-title">
              <h3>InBalance</h3>
              <span className="project-type">Creator & engineer</span>
            </div>
            <p>
              Turning complicated tax obligations into a clear next step. I
              built the mobile app and the backend behind its calculations,
              schedules, and payment records.
            </p>
            <div className="tags">
              <span>React Native</span>
              <span>Go</span>
              <span>PostgreSQL</span>
            </div>
            <details className="case-study">
              <summary>
                The thinking behind the build
                <Arrow diagonal />
              </summary>
              <div className="case-study-content">
                <h4>Clarity at the surface. Care underneath.</h4>
                <p>
                  The interface needs to make the next action understandable.
                  The backend needs to preserve how that action was calculated.
                </p>
                <ul>
                  <li>
                    Versioned calculation snapshots preserve the history behind
                    a number.
                  </li>
                  <li>
                    Transactional, idempotent payment records prevent retries
                    from creating duplicate records.
                  </li>
                  <li>
                    Sign-in, subscription verification, reminders, and
                    payment-proof storage connect the product from end to end.
                  </li>
                </ul>
                <p className="case-study-note">
                  Independent product built under Eunoia Technologies. This is a
                  look at the engineering, with an illustrative product
                  screenshot.
                </p>
              </div>
            </details>
          </div>
        </article>
        <article className="project project-betterhelp">
          <div className="project-visual betterhelp-visual">
            <div className="project-visual-top">
              <span>PRODUCT ENGINEERING</span>
              <span>02 — WEB + BACKEND</span>
            </div>
            <div className="system-art" aria-hidden="true">
              <div className="system-orbit orbit-one" />
              <div className="system-orbit orbit-two" />
              <span className="system-node node-web">web</span>
              <span className="system-node node-mobile">mobile</span>
              <span className="system-node node-api">api</span>
              <div className="system-core">
                <span>human</span>
                <span>at the center</span>
                <svg viewBox="0 0 80 60" fill="none">
                  <path
                    d="M8 30h12l7-17 12 35 12-35 7 17h14"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
            <span className="visual-footnote betterhelp-footnote">
              A SYSTEM IS ONLY AS GOOD AS ITS CONNECTIONS.
            </span>
          </div>
          <div className="project-body">
            <div className="project-title">
              <h3>BetterHelp</h3>
              <span className="project-type">Software engineer</span>
            </div>
            <p>
              Engineering across the parts of a healthcare product that need to
              work together: onboarding, subscriptions, payments, and
              web-to-mobile communication.
            </p>
            <div className="tags">
              <span>React</span>
              <span>TypeScript</span>
              <span>PHP</span>
              <span>MySQL</span>
            </div>
            <details className="case-study">
              <summary>
                A few things I’ve worked on
                <Arrow diagonal />
              </summary>
              <div className="case-study-content">
                <h4>The work between the screens.</h4>
                <ul>
                  <li>
                    Connected push registration across PHP authentication APIs,
                    React, WebViews, and native mobile bridges.
                  </li>
                  <li>
                    Separated checkout pricing and experiment logic into typed
                    services, with regression tests for existing behavior.
                  </li>
                  <li>
                    Fixed duplicate late-cancellation charges for family
                    accounts and corrected refund and dispute reconciliation.
                  </li>
                  <li>
                    Reduced session-comment queries from five per session to
                    five total through batch loading.
                  </li>
                  <li>
                    Improved keyboard navigation, dialogs, and scheduling
                    announcements.
                  </li>
                </ul>
                <p className="case-study-note">
                  Selected contributions as part of the BetterHelp engineering
                  team. The illustration is original artwork, not a product
                  interface.
                </p>
              </div>
            </details>
          </div>
        </article>
      </div>
      <div className="work-afterword">
        <p>
          <span aria-hidden="true">↳</span> There’s more in the workshop.
          Earlier builds, experiments, and things learned along the way.
        </p>
        <ExternalLink href={profile.github} className="text-link">
          Explore my GitHub
        </ExternalLink>
      </div>
    </section>
  );
}
