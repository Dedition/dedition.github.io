import { experience, profile } from "../constants";
import { Arrow } from "./Icons";

export default function Experience() {
  return (
    <section
      className="experience-section shell section-space"
      id="experience"
      aria-labelledby="experience-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow section-index">03 / ALONG THE WAY</p>
          <h2 id="experience-heading">
            The <span className="serif-word">experience.</span>
          </h2>
        </div>
        <a className="text-link" href={profile.resume} download>
          Download résumé
          <Arrow diagonal />
        </a>
      </div>
      <div className="experience-list">
        {experience.map((job, index) => (
          <article className="experience-row" key={job.company}>
            <div className="experience-date">
              <span className="experience-number">0{index + 1}</span>
              <span>{job.date}</span>
            </div>
            <div className="experience-company">
              <h3>{job.company}</h3>
              <p>{job.context}</p>
            </div>
            <div className="experience-description">
              <h4>{job.role}</h4>
              <p>{job.description}</p>
              <div className="tags">
                {job.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="earlier-career">
        <span>BEFORE SOFTWARE</span> Dispatch Supervisor, ABM Industries{" "}
        <span>2017–2021</span>
      </p>
    </section>
  );
}
