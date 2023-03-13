import {
    mobile,
    backend,
    creator,
    web,
    javascript,
    typescript,
    html,
    css,
    reactjs,
    redux,
    tailwind,
    nodejs,
    mongodb,
    git,
    figma,
    docker,
    meta,
    abm,
    stealth,
    hsm,
    starbucks,
    tesla,
    shopify,
    carrent,
    jobit,
    tripguide,
    threejs,
    aws,
    gcp,
    python,
    database,
    postgresql,
    sequelize,
    flask,
    nextjs,
    express,
    jenkins,
    gitlab,
    posys,
    flickr,
    chatbot,
} from "../assets";

export const navLinks = [
    {
        id: "about",
        title: "About",
    },
    {
        id: "work",
        title: "Work",
    },
    {
        id: "contact",
        title: "Contact",
    },
];

const services = [
    {
        title: "Web Developer",
        icon: web,
    },
    {
        title: "React Native Developer",
        icon: mobile,
    },
    {
        title: "Backend Developer",
        icon: backend,
    },
    {
        title: "Cloud Developer",
        icon: creator,
    },
];

const technologies = [
    // {
    //     name: "HTML 5",
    //     icon: html,
    // },
    // {
    //     name: "CSS 3",
    //     icon: css,
    // },
    {
        name: "JavaScript",
        icon: javascript,
    },
    {
        name: "TypeScript",
        icon: typescript,
    },
    {
        name: "React JS",
        icon: reactjs,
    },
    {
        name: "Redux Toolkit",
        icon: redux,
    },
    // {
    //     name: "Tailwind CSS",
    //     icon: tailwind,
    // },
    {
        name: "Node JS",
        icon: nodejs,
    },
    {
        name: "MongoDB",
        icon: mongodb,
    },
    // {
    //     name: "Three JS",
    //     icon: threejs,
    // },
    // {
    //     name: "git",
    //     icon: git,
    // },
    // {
    //     name: "figma",
    //     icon: figma,
    // },
    {
        name: "docker",
        icon: docker,
    },
    {
        name: "AWS",
        icon: aws,
    },
    {
        name: "GCP",
        icon: gcp,
    },
    {
        name: "Python",
        icon: python,
    },
    // {
    //     name: "Database",
    //     icon: database,
    // },
    {
        name: "PostgreSQL",
        icon: postgresql,
    },
    {
        name: "Sequelize",
        icon: sequelize,
    },
    {
        name: "Flask",
        icon: flask,
    },
    {
        name: "Next JS",
        icon: nextjs,
    },
    {
        name: "Express JS",
        icon: express,
    },
    // {
    //     name: "Jenkins",
    //     icon: jenkins,
    // },
    {
        name: "GitLab",
        icon: gitlab,
    },


];

const experiences = [
    {
        title: "Dispatch Administrator",
        company_name: "ABM Industries",
        icon: abm,
        iconBg: "#E6DEDD",
        date: "Mar 2017 - Jul 2021",
        points: [
            "Formulated code to extract, transform, and load data from various sources into the dispatch systems",
            "Designed Python scripts to automate over 40 hours per month of data entry work",
            "Established effective communication channels to facilitate collaboration between team members and stakeholders, ensuring project goals were met within established timelines and budgets",
            "Analyzed and optimized the internal tooling system's performance and scalability, utilizing tools such as load testing and database indexing, resulting in a 25% increase in system efficiency and a 50% decrease in system downtime",
        ],
    },
    {
        title: "Full-Stack Software Engineer",
        company_name: "Stealth",
        icon: stealth,
        iconBg: "#f1f1f1",
        date: "Aug 2022 - Present",
        points: [
            "Optimized web application performance through the implementation of advanced caching strategies, data prefetching techniques, and lazy loading, resulting in a 50% reduction in page load times and a 25% increase in user retention",
            "Utilized Next.js for server-side rendering to optimize website speed and reduce page load times by up to 50%, resulting in a significant improvement in search engine rankings and user retention",
            "Implemented highly efficient CI/CD pipelines using GitLab, ensuring smooth and rapid code deployment for increased reliability and enhanced feature rollout capabilities",
            "Improved scalability, speed and developer workflow by deploying Docker containers that broke down a monolithic  application into microservices within a Kubernetes cluster",
            "Design and implement RESTful APIs and microservices to enable seamless communication between the front-end and back-end of web applications",
        ],
    },
    // {
    //     title: "Web Developer",
    //     company_name: "Shopify",
    //     icon: shopify,
    //     iconBg: "#383E56",
    //     date: "Jan 2022 - Jan 2023",
    //     points: [
    //         "Developing and maintaining web applications using React.js and other related technologies.",
    //         "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
    //         "Implementing responsive design and ensuring cross-browser compatibility.",
    //         "Participating in code reviews and providing constructive feedback to other developers.",
    //     ],
    // },
    // {
    //     title: "Full stack Developer",
    //     company_name: "Meta",
    //     icon: meta,
    //     iconBg: "#E6DEDD",
    //     date: "Jan 2023 - Present",
    //     points: [
    //         "Developing and maintaining web applications using React.js and other related technologies.",
    //         "Collaborating with cross-functional teams including designers, product managers, and other developers to create high-quality products.",
    //         "Implementing responsive design and ensuring cross-browser compatibility.",
    //         "Participating in code reviews and providing constructive feedback to other developers.",
    //     ],
    // },
];

const testimonials = [
    {
        testimonial:
            "I thought it was impossible to make a website as beautiful as our product, but Rick proved me wrong.",
        name: "Sara Lee",
        designation: "CFO",
        company: "Acme Co",
        image: "https://randomuser.me/api/portraits/women/4.jpg",
    },
    {
        testimonial:
            "I've never met a web developer who truly cares about their clients' success like Rick does.",
        name: "Chris Brown",
        designation: "COO",
        company: "DEF Corp",
        image: "https://randomuser.me/api/portraits/men/5.jpg",
    },
    {
        testimonial:
            "After Rick optimized our website, our traffic increased by 50%. We can't thank them enough!",
        name: "Lisa Wang",
        designation: "CTO",
        company: "456 Enterprises",
        image: "https://randomuser.me/api/portraits/women/6.jpg",
    },
];

const projects = [
    {
        name: "POS-System",
        description:
            "Web application built using MERN stack (MongoDB, Express.js, React, Node.js) for a point-of-sale administrative overview app with a frontend using React, Material-UI, and Nivo Charts and a backend using Node.js, Express.js, and Mongoose. State management is handled with Redux Toolkit and data fetching with Redux Toolkit Query.",
        tags: [
            {
                name: "react",
                color: "blue-text-gradient",
            },
            {
                name: "redux",
                color: "pink-text-gradient",
            },
            {
                name: "mongodb",
                color: "green-text-gradient",
            },
            {
                name: "typescript",
                color: "pink-text-gradient",
            },
            {
                name: "Node.js",
                color: "orange-text-gradient",
            },
        ],
        image: posys,
        source_code_link: "https://github.com/Dedition/pos-system",
        live_link: "https://pos-frontend.onrender.com/",
    },
    {
        name: "FlickrClone",
        description:
            "FlickrClone is a website for users to upload and browse images about anything they want. It is heavily inspired by Flickr.com. Made with a ReactJS frontend and ExpressJS backend. Includes, AWS, Redux, Docker, Node.js and Redux.",
        tags: [
            {
                name: "react",
                color: "blue-text-gradient",
            },
            {
                name: "redux",
                color: "pink-text-gradient",
            },
            {
                name: "restapi",
                color: "green-text-gradient",
            },
            {
                name: "AWS",
                color: "orange-text-gradient",
            },
            {
                name: "Docker",
                color: "blue-text-gradient",
            },
            {
                name: "Express.js",
                color: "white-text-gradient",
            },
        ],
        image: flickr,
        source_code_link: "https://github.com/Dedition/flickr-clone",
        live_link: "https://flickrpixelclone.herokuapp.com/"
    },
    {
        name: "AI SalesBot",
        description:
            "AI bot designed within a Python application that uses NLP, GPT-3 and deep learning to provide accurate and personalized responses to customer inquiries, reducing the workload of customer service teams. It has an accuracy rate of over 96% and is optimized for faster response times and greater efficiency.",
        tags: [
            {
                name: "python",
                color: "blue-text-gradient",
            },
            {
                name: "GPT-3",
                color: "green-text-gradient",
            },
            {
                name: "tensorflow",
                color: "pink-text-gradient",
            },
            {
                name: "numpy",
                color: "orange-text-gradient",
            },
        ],
        image: chatbot,
        source_code_link: "https://github.com/Dedition/intelsalebot",
    },
];

export { services, technologies, experiences, testimonials, projects };
