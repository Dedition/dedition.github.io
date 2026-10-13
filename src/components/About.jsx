import { toolkit } from "../constants";

export default function About() {
  return (
    <section
      className="about-section section-space"
      id="about"
      aria-labelledby="about-heading"
    >
      <div className="shell about-grid">
        <div className="about-title">
          <p className="eyebrow section-index">
            02 / THE PERSON BEHIND THE CODE
          </p>
          <h2 id="about-heading">
            A winding path.
            <br />A deliberate
            <br />
            <span className="serif-word">direction.</span>
          </h2>
          <div className="about-stamp" aria-hidden="true">
            <span>LL</span>
            <span>
              ALWAYS
              <br />A WORK IN
              <br />
              PROGRESS.
            </span>
            <span>↗</span>
          </div>
        </div>
        <div className="about-story">
          <p className="large-copy">
            I like making complicated things feel straightforward.
          </p>
          <p>
            I was born in the UK and have called the US home since 2017.
          </p>
          <p>
            My path into software started outside it. I worked in dispatch at
            ABM Industries before training at App Academy, helping other
            developers learn, and moving into full-stack engineering.
          </p>
          <p>
            Now my work spans healthcare software at BetterHelp and InBalance,
            an independent product I built from the mobile experience down to
            the database. Different problems, same instinct: understand the
            details, then make the experience clearer.
          </p>
          <p>
            I care about what happens after the happy path. The retried request.
            The unexpected payment state. The person navigating with a keyboard.
            That’s where thoughtful engineering shows up.
          </p>
          <p>
            AI and machine learning have always fascinated me, especially
            artificial general intelligence (AGI). I explore that interest
            through small projects and experiments in my own time.
          </p>
          <div className="toolkit">
            <p className="eyebrow">A FEW TOOLS I REACH FOR</p>
            {toolkit.map(({ label, tools }) => (
              <div className="toolkit-row" key={label}>
                <span>{label}</span>
                <span>{tools}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
