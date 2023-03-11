import Tilt from 'react-tilt';
import { motion } from 'framer-motion';

import { styles } from '../styles';
import { services } from '../constants';
import { fadeIn, textVariant } from '../utils/motion';

const About = () => {
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>
          Introduction
        </p>
        <h2 className={styles.sectionHeadText}>
          Overview.
        </h2>
      </motion.div>

      <motion.p
        variants={fadeIn("", "", 0.1, 1)}
        className="mt-4 text-secondary text-[17px] max-w-3xl leading-[30px]"
      >
        As a highly skilled Software Developer, I possess a wealth of experience in an eclectic array of programming languages including
        Javascript, Typescript, Python, SQL, and HTML/CSS.
        I am an expert in multiple frameworks including React, Redux, Node.js, MongoDB, Express.js, PostgreSQL, Flask and many others.
        My proficiency extends to setting up cloud infrastructure in Docker containers, managing Kubernetes clusters, and
        streamlining processes in top CI/CD platforms like Jenkins and GitLabs.
        I pride myself on being a fast learner and have experience in client-facing roles dealing with stakeholders and high-profile clients.
        Let's collaborate to transform your vision into reality!
      </motion.p>
    </>
  )
}

export default About;
