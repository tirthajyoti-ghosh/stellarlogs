// Content data for the space portfolio

const portfolioContent = {
    // Work Experience Star System
    workExperience: {
        id: "work-experience",
        name: "Work Experience",
        starColor: "#FF9D00", // Orange star
        overview: "My professional journey and career highlights across various roles and companies.",
        planets: [
            {
                name: "Senior Software Engineer",
                color: "#FF5733",
                overview: "Go-to person for bug hunting at CyberFortress (2024-2025)",
                details: `
                    <h3>Senior Software Engineer at CyberFortress</h3>
                    <p class="time-period">March 2024 - March 2025</p>

                    <h4>Technologies</h4>
                    <p>React, Node.js, TypeScript, AWS (Lambda, S3, DynamoDB), Docker, Kubernetes</p>
                    
                    <h4>Achievements</h4>
                    <ul>
                        <li>Engineered a self-service invoice portal consolidating 25+ products using TypeScript, Next.js, and SQL; slashed manual processing by 200+ hours monthly.</li>
                        <li>Architected a cloud-native Python application on GCP end-to-end to automate a legacy script for repairing corrupted data—eliminating manual intervention, saving an estimated 150+ hours/month, and enhancing team GCP expertise through detailed documentation.</li>
                        <li>Pioneered an internal usage analytics platform (Next.js, TypeScript, Postgres, Python, GCP) to aggregate customer usage data across 25+ products—projected to reduce manual reporting by a significant margin and drive data-informed decisions.</li>
                        <li>Dove headfirst into maintaining multiple decade-old legacy systems with zero documentation—rapidly acquiring expertise and eliminating critical bugs to stabilize platform operations.</li>
                    </ul>
                `
            },
            {
                name: "Co-founder & CTO",
                color: "#C70039",
                overview: "Building cool stuff at Amigo (2023-2024)",
                details: `
                    <h3>Co-founder & CTO at Amigo</h3>
                    <p class="time-period">November 2023 - October 2024</p>
                    
                    <h4>Technologies</h4>
                    <p>Node.js, Express, MongoDB, Redis, Docker, Jenkins, Jest</p>
                    
                    <h4>Achievements</h4>
                    <ul>
                        <li>Recruited and managed a team of 5 junior engineers, mentoring them in technical and architectural best practices.</li>
                        <li>Acted as the technical decision-maker, overseeing all product development (React Native, Typescript, Nest.js, Upstash Queue NextJS, MongoDB), deployment (GitHub Actions), and scalability aspects.</li>
                        <li>Fixed critical authentication and expense ledger issues, saving $1,000/month in Firebase costs by repairing SMS OTP login, implementing a mock authentication system, and rebuilding the chat-based expense ledger, transforming it from unusable to seamless.</li>
                        <li>Shaped product direction and improved UX by collaborating with business, marketing, and design teams and leading real-world beta testing with industry experts and power users, refining the app based on their insights.</li>
                    </ul>
                `
            },
            {
                name: "Software Engineer",
                color: "#900C3F",
                overview: "Built mobile and web backbone at Appleute (2022-2023)",
                details: `
                    <h3>Software Engineer at Appleute</h3>
                    <p class="time-period">February 2022 - August 2023</p>
                    
                    <h4>Technologies</h4>
                    <p>HTML/CSS, JavaScript, PHP, MySQL, WordPress, Google Analytics</p>
                    
                    <h4>Achievements</h4>
                    <ul>
                        <li>Architected and developed the front-end of PUMA's Employee App CATch Up (Android, iOS), utilizing React Native and TypeScript; improved user experience for 20,000+ employees worldwide.</li>
                        <li>Transformed the company's engineering culture by establishing a robust frontend engineering core and introducing best practices adopted by 6 engineers and 5+ projects, enhancing UI consistency, cutting development time, and minimizing UI bugs.</li>
                        <li>Guided 4 interns through intensive software engineering projects, fostering skill growth; 2 secured full-time positions and spearheaded critical projects, demonstrating mentorship effectiveness and team contribution.</li>
                        <li>Single-handedly built the entire v1 pixel-perfect front end of Bücherbüchse (React Native and TypeScript) - an Instagram-like social media app for book readers (Android, iOS).</li>
                        <li>Designed and built Bücherbüchse‘s multiple core services (books, reviews, users, comments, content, notifications, etc.) in a distributed backend, currently serving over 23,000 users.</li>
                        <li>Overhauled legacy code, boosting feature development efficiency by 90%, streamlining the onboarding process for new developers, and fostering team collaboration.</li>
                    </ul>
                `
            },
            {
                name: "Fullstack Engineer",
                color: "#900C3F",
                overview: "Frontend lead in a one-man frontend team at Down For Coffee (2021-2021)",
                details: `
                    <h3>Fullstack Engineer at Down For Coffee</h3>
                    <p class="time-period">January 2021 - July 2021</p>
                    
                    <h4>Technologies</h4>
                    <p>HTML/CSS, JavaScript, PHP, MySQL, WordPress, Google Analytics</p>
                    
                    <h4>Achievements</h4>
                    <ul>
                        <li>Developed and implemented the entire front-end architecture using React/Redux and LESS, translating intricate UI/UX Figma design specifications into a visually captivating SPA.</li>
                        <li>Created multiple third-party integrations (calendar, HR software, etc.) in Node.js using Serverless architecture (deployed in AWS).</li>
                        <li>Engineered a highly efficient Slack bot using Node.js, granting users access to essential dashboard features directly within the Slack interface; eliminated the need for repeated logins, optimizing workflow, and reducing friction.</li>
                    </ul>
                `
            },
            {
                name: "Code Reviewer",
                color: "#900C3F",
                overview: "Mentoring juniors started at Microverse (2020-2020)",
                details: `
                    <h3>Code Reviewer at Microverse</h3>
                    <p class="time-period">June 2020 - December 2020</p>
                    
                    <h4>Technologies</h4>
                    <p>HTML/CSS, JavaScript, PHP, MySQL, WordPress, Google Analytics</p>
                    
                    <h4>Achievements</h4>
                    <ul>
                        <li>Analyzed  400+ student code submissions, identifying vulnerabilities and logic errors; offered personalized feedback to elevate code quality and comprehension of software engineering principles for each student.</li>
                        <li>Mentored and guided a team of junior web developers, through regular 1:1 video calls, conducting comprehensive code reviews and providing technical support.</li>
                    </ul>
                `
            },
        ]
    },
    
    // Projects Star System
    projects: {
        id: "projects",
        name: "Projects",
        starColor: "#5CAFFB", // Blue star
        overview: "A collection of personal and professional projects I've built throughout my career.",
        planets: [
            {
                name: "Expo LLM Mediapipe",
                color: "#33FF57",
                overview: "This interactive space-themed portfolio",
                details: `
                    <h3>Space Portfolio</h3>
                    
                    <h4>Project Overview</h4>
                    <p>An interactive, space-themed portfolio website that visualizes different sections of my
                    professional profile as star systems and planets that can be explored in a gamified experience.</p>
                    
                    <div class="project-media">
                        <div class="project-video">
                            <video controls>
                                <source src="https://video.twimg.com/amplify_video/1911844223751467008/vid/avc1/720x1178/azC3A2-aCaGPe9cC.mp4?tag=14" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                            <p class="caption">Demo of the navigation through the portfolio universe</p>
                        </div>
                    </div>
                    
                    <h4>Technologies</h4>
                    <ul>
                        <li>HTML5 Canvas for the interactive space simulation</li>
                        <li>Vanilla JavaScript with module structure</li>
                        <li>CSS3 for UI elements and animations</li>
                        <li>Deployed on Vercel for high performance</li>
                    </ul>
                    
                    <h4>Key Features</h4>
                    <ul>
                        <li>Interactive spaceship controls to explore the universe</li>
                        <li>Procedurally generated star systems representing portfolio sections</li>
                        <li>Radar and navigation HUD elements for enhanced immersion</li>
                        <li>Modal system for detailed content display</li>
                    </ul>
                    
                    <h4>Links</h4>
                    <p><a href="https://github.com/yourusername/space-portfolio" target="_blank">GitHub Repository</a></p>
                `
            }
        ]
    },
    
    // Blog Star System
    blog: {
        id: "blog",
        name: "Blog",
        starColor: "#F6F0A3", // Yellow star
        overview: "Articles and thoughts I've published about technology, development, and career growth.",
        planets: [
            {
                name: "Web Dev Trends",
                color: "#3357FF",
                overview: "Latest trends in web development for 2025",
                details: `
                    <h3>Web Development Trends for 2025</h3>
                    <p class="publication-date">Published: February 15, 2025</p>
                    
                    <div class="article-excerpt">
                        <p>As we progress through 2025, several key trends are reshaping how we build for the web.
                        From AI-integrated development to new browser capabilities, here's what's defining modern web development.</p>
                        
                        <h4>Key Trends Covered</h4>
                        <ul>
                            <li>AI-assisted coding and its impact on developer workflows</li>
                            <li>The rise of WebAssembly and edge computing</li>
                            <li>Next-gen CSS features transforming web design</li>
                            <li>Accessibility as a primary development concern</li>
                            <li>Privacy-first development practices</li>
                        </ul>
                        
                        <p><a href="https://myblog.com/web-dev-trends-2025" target="_blank">Read the full article →</a></p>
                    </div>
                `
            },
            {
                name: "AI Revolution",
                color: "#6A5ACD",
                overview: "How AI is changing the software industry",
                details: `
                    <h3>The AI Revolution in Software Development</h3>
                    <p class="publication-date">Published: November 8, 2024</p>
                    
                    <div class="article-excerpt">
                        <p>Artificial intelligence is fundamentally changing how software is built, tested, and maintained.
                        This article explores the practical applications of AI in today's development landscape.</p>
                        
                        <h4>Key Points</h4>
                        <ul>
                            <li>How AI pair programmers are boosting developer productivity</li>
                            <li>Automated testing and bug detection with machine learning</li>
                            <li>AI-driven code refactoring and optimization</li>
                            <li>The ethical considerations of AI-assisted development</li>
                            <li>Preparing development teams for the AI transition</li>
                        </ul>
                        
                        <p><a href="https://myblog.com/ai-revolution-software-dev" target="_blank">Read the full article →</a></p>
                    </div>
                `
            },
            {
                name: "Clean Code",
                color: "#7B68EE",
                overview: "Principles of writing maintainable code",
                details: `
                    <h3>Clean Code Principles for Modern Development</h3>
                    <p class="publication-date">Published: August 23, 2024</p>
                    
                    <div class="article-excerpt">
                        <p>Writing clean, maintainable code remains one of the most valuable skills for any developer.
                        This article revisits timeless principles and adapts them for today's development environments.</p>
                        
                        <h4>Topics Covered</h4>
                        <ul>
                            <li>Naming conventions that enhance code readability</li>
                            <li>Function composition and the single responsibility principle</li>
                            <li>State management techniques for cleaner code</li>
                            <li>Comment strategies that actually help future developers</li>
                            <li>Balancing clean code with performance considerations</li>
                            <li>Refactoring strategies for legacy codebases</li>
                        </ul>
                        
                        <p><a href="https://myblog.com/clean-code-modern-dev" target="_blank">Read the full article →</a></p>
                    </div>
                `
            }
        ]
    },
    
    // Recommendations Star System
    recommendations: {
        id: "recommendations",
        name: "Recommendations",
        starColor: "#FF5376", // Pink star
        overview: "Professional recommendations and testimonials from colleagues.",
        planets: [
            {
                name: "Engineering Manager Review",
                color: "#F3FF33",
                overview: "From Patrick Thomas, Engineering Manager at CyberFortress",
                details: `
                    <h3>Recommendation from Patrick Thomas</h3>
                    <p class="title-company">Engineering Manager at CyberFortress</p>
                    
                    <div class="testimonial">
                        <p>"To say Tirtha exceeded every challenge I gave him would be an understatement. I hired Tirtha as a front end developer, primarily to contribute to our React codebase. Tirtha implemented UI's faithful to designs and designed his own intuitive interfaces. He created rock-solid Typescript code that implemented OAuth, secured sensitive APIs, and built interfaces to other internal systems. As priorities changed, Tirtha volunteered to contribute to a Ruby on Rails app that no one on staff had much experience with, contributed to inherited .Net 4 C# ASP.net MVC solutions, and fully architected a cloud native Python app to assist with customer support functions. Whenever there was code that absolutely HAD to work well, I trusted Tirtha. When there was code that needed to be turned around fast, I trusted Tirtha. Tirtha is the kind of developer that makes a good IT team a GREAT one."</p>
                    </div>
                    
                    <div class="recommendation-date">
                        <p>March 2025</p>
                    </div>
                `
            },
            {
                name: "Teammate Review",
                color: "#FFCC33",
                overview: "From Theophile Kango, Software Developer",
                details: `
                    <h3>Recommendation from Theophile Kango</h3>
                    <p class="title-company">Software Developer at QHARE CRM</p>
                    
                    <div class="testimonial">
                        <p>"Ghosh is one of my teammates at microverse, he is always there to help, every time when I am stuck or I need feedback on my project I can't hesitate to reach out to him. he is a talented guy and I confirm his skills."</p>
                    </div>
                    
                    <div class="recommendation-date">
                        <p>August 2020</p>
                    </div>
                `
            },
            {
                name: "Mentee Review",
                color: "#FFCC33",
                overview: "From Arslan Bisharat, Researcher",
                details: `
                    <h3>Recommendation from John Smith</h3>
                    <p class="title-company">Research Assistant at Loyola University Chicago</p>
                    
                    <div class="testimonial">
                        <p>"Mr. Ghosh is one of the very few amazing personalities I have come across in the software development field. I have had the opportunity to become his mentee where I have always counted on him for an explanation when a complex part of the project confused me. Not only does he goes out of the way to make a project even better, but also he goes out of the way to help a fellow teammate in their assignments. He would be an amazing addition to your team and a great leader too."</p>
                    </div>
                    
                    <div class="recommendation-date">
                        <p>July 2020</p>
                    </div>
                `
            },
            {
                name: "Teammate Review",
                color: "#FFCC33",
                overview: "From Javier Oriol Correas Sanchez-Cuesta, Fullstack Engineer",
                details: `
                    <h3>Recommendation from John Smith</h3>
                    <p class="title-company">Fullstack Engineer</p>
                    
                    <div class="testimonial">
                        <p>"I met Ghosh in our journey at Microverse. It was a pleasure working with him, during our work together we were able to improve on what the other failed thanks to a great collaboration. Hard worker, reliable, professional and fun. It is a safe bet for any company"</p>
                    </div>
                    
                    <div class="recommendation-date">
                        <p>June 2020</p>
                    </div>
                `
            },
        ]
    },
    
    // Current Reading Star System
    reading: {
        id: "current-reads",
        name: "Current Reading",
        starColor: "#FF33F6", // Purple star
        overview: "Books I'm currently reading or have recently finished.",
        planets: [
            {
                name: "We Are Bob (Bobiverse) - Dennis E. Taylor",
                color: "#ff00f2",
                overview: "March 2025 - Currently reading",
            },
            {
                name: "Artemis - Andy Weir",
                color: "#DA70D6",
                overview: "February 2025",
            },
            {
                name: "Project Hail Mary - Andy Weir",
                color: "#830683",
                overview: "October 2024",
            },
        ]
    },
    
    // TV Shows Star System
    shows: {
        id: "shows",
        name: "TV Shows",
        starColor: "#33FFF3", // Cyan star
        overview: "Shows I'm watching and recommend, with thoughts and reviews.",
        planets: [
            {
                name: "Modern Family",
                color: "#5CFFF4",
                overview: "November 2024",
            },
            {
                name: "F.R.I.E.N.D.S",
                color: "#00B3A7",
                overview: "January 2025",
            },
            {
                name: "The Mentalist",
                color: "#0DECF8",
                overview: "March 2025",
            },
            {
                name: "The Orville",
                color: "#33CFFF",
                overview: "April 2025",
            },
        ]
    },
    
    // Travel Map Star System
    travel: {
        id: "travel",
        name: "Travel Map",
        starColor: "#C433FF", // Violet star
        overview: "Places I've visited around the world and travel experiences.",
        planets: [
            {
                name: "Hampi, India",
                color: "#C433FF",
                overview: "My adventures in Hampi, India",
                details: `
                    <h3>Hampi Adventures</h3>
                    
                    <div class="travel-highlight">
                        <h4>Remote Work from Lisbon, Portugal</h4>
                        <p class="travel-date">Summer 2024 - 6 weeks</p>
                        <p>Worked remotely while exploring this tech hub. Attended local developer meetups
                        and co-working spaces, connecting with the vibrant startup scene while enjoying
                        the city's incredible food and coastal scenery.</p>
                        <p><strong>Tech connection:</strong> Participated in Web Summit and collaborated
                        with local developers on an open-source project.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Technology Museum Tour - Germany</h4>
                        <p class="travel-date">Spring 2023 - 2 weeks</p>
                        <p>Visited Berlin, Munich, and Hamburg with a focus on technology museums and
                        computer history exhibitions. The Deutsches Museum's computing section and
                        the Computerspielemuseum were particular highlights that connected me to the
                        rich history of our field.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Nordic Code Retreat - Sweden & Finland</h4>
                        <p class="travel-date">Winter 2023 - 10 days</p>
                        <p>Combined winter activities with coding sessions at a remote cabin retreat
                        in the Swedish countryside, followed by visits to tech companies in Stockholm
                        and Helsinki. Experiencing the Nordic approach to work-life balance was
                        enlightening and influenced my own productivity habits.</p>
                    </div>
                `
            },
            {
                name: "Goa, India",
                color: "#9370DB",
                overview: "Exploring cultures across Asia",
                details: `
                    <h3>Asian Explorations</h3>
                    
                    <div class="travel-highlight">
                        <h4>Tokyo, Japan - Tech Innovation Tour</h4>
                        <p class="travel-date">Fall 2024 - 3 weeks</p>
                        <p>Immersed myself in Tokyo's unique technology culture, from robotics exhibitions
                        to retro gaming arcades and electronics districts. Visited major tech companies and
                        attended a developer conference focused on AI applications.</p>
                        <p><strong>Highlight:</strong> Experiencing the remarkable blend of tradition and
                        cutting-edge technology that defines Japanese innovation culture.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Digital Nomad Experience - Bali, Indonesia</h4>
                        <p class="travel-date">Winter 2022 - 2 months</p>
                        <p>Joined a community of remote workers in Canggu, Bali. Balanced coding and
                        project work with surfing and exploring the island. The experience of maintaining
                        productivity while embracing a completely different lifestyle was transformative.</p>
                        <p><strong>Work insight:</strong> Discovered that my problem-solving capabilities
                        improved significantly when alternating focused work with nature experiences.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Seoul, South Korea - Gaming Culture</h4>
                        <p class="travel-date">Spring 2023 - 10 days</p>
                        <p>Explored Seoul's vibrant gaming and technology scene, from esports arenas to
                        gaming cafes and the Samsung Innovation Museum. Gained valuable insights into
                        Korean UI/UX design approaches and mobile technology trends.</p>
                    </div>
                `
            },
            {
                name: "Thailand",
                color: "#8A2BE2",
                overview: "Road trips and city explorations in North and South America",
                details: `
                    <h3>Explorations Across the Americas</h3>
                    
                    <div class="travel-highlight">
                        <h4>Tech Conference Tour - USA</h4>
                        <p class="travel-date">Various dates, 2022-2024</p>
                        <p>Combined professional development with exploration by attending major tech
                        conferences across the US. From WWDC in California to AWS re:Invent in Las Vegas
                        and smaller specialized conferences, these trips have been invaluable for networking
                        and staying at the forefront of technology trends.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Startup Ecosystem Visit - São Paulo, Brazil</h4>
                        <p class="travel-date">Summer 2023 - 2 weeks</p>
                        <p>Explored Brazil's largest city with a focus on its growing tech startup scene.
                        Visited incubators, attended local tech meetups, and connected with Brazilian
                        developers to learn about the unique challenges and opportunities in Latin
                        America's largest tech market.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Cross-Country Remote Work Road Trip</h4>
                        <p class="travel-date">Summer 2022 - 4 weeks</p>
                        <p>Drove across the United States while working remotely, testing the limits of
                        digital nomadism. Used a mobile hotspot to join meetings from national parks and
                        remote locations. This experience taught me valuable lessons about adapting to
                        different working environments and maintaining productivity while on the move.</p>
                        <p><strong>Tech setup:</strong> Created a comprehensive mobile workstation in my vehicle
                        with power inverters, connectivity solutions, and ergonomic considerations.</p>
                    </div>
                `
            },
            {
                name: "Meghalaya, India",
                color: "#8A2BE2",
                overview: "Road trips and city explorations in North and South America",
                details: `
                    <h3>Explorations Across the Americas</h3>
                    
                    <div class="travel-highlight">
                        <h4>Tech Conference Tour - USA</h4>
                        <p class="travel-date">Various dates, 2022-2024</p>
                        <p>Combined professional development with exploration by attending major tech
                        conferences across the US. From WWDC in California to AWS re:Invent in Las Vegas
                        and smaller specialized conferences, these trips have been invaluable for networking
                        and staying at the forefront of technology trends.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Startup Ecosystem Visit - São Paulo, Brazil</h4>
                        <p class="travel-date">Summer 2023 - 2 weeks</p>
                        <p>Explored Brazil's largest city with a focus on its growing tech startup scene.
                        Visited incubators, attended local tech meetups, and connected with Brazilian
                        developers to learn about the unique challenges and opportunities in Latin
                        America's largest tech market.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Cross-Country Remote Work Road Trip</h4>
                        <p class="travel-date">Summer 2022 - 4 weeks</p>
                        <p>Drove across the United States while working remotely, testing the limits of
                        digital nomadism. Used a mobile hotspot to join meetings from national parks and
                        remote locations. This experience taught me valuable lessons about adapting to
                        different working environments and maintaining productivity while on the move.</p>
                        <p><strong>Tech setup:</strong> Created a comprehensive mobile workstation in my vehicle
                        with power inverters, connectivity solutions, and ergonomic considerations.</p>
                    </div>
                `
            },
            {
                name: "Himalayas, India",
                color: "#8A2BE2",
                overview: "Road trips and city explorations in North and South America",
                details: `
                    <h3>Explorations Across the Americas</h3>
                    
                    <div class="travel-highlight">
                        <h4>Tech Conference Tour - USA</h4>
                        <p class="travel-date">Various dates, 2022-2024</p>
                        <p>Combined professional development with exploration by attending major tech
                        conferences across the US. From WWDC in California to AWS re:Invent in Las Vegas
                        and smaller specialized conferences, these trips have been invaluable for networking
                        and staying at the forefront of technology trends.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Startup Ecosystem Visit - São Paulo, Brazil</h4>
                        <p class="travel-date">Summer 2023 - 2 weeks</p>
                        <p>Explored Brazil's largest city with a focus on its growing tech startup scene.
                        Visited incubators, attended local tech meetups, and connected with Brazilian
                        developers to learn about the unique challenges and opportunities in Latin
                        America's largest tech market.</p>
                    </div>
                    
                    <div class="travel-highlight">
                        <h4>Cross-Country Remote Work Road Trip</h4>
                        <p class="travel-date">Summer 2022 - 4 weeks</p>
                        <p>Drove across the United States while working remotely, testing the limits of
                        digital nomadism. Used a mobile hotspot to join meetings from national parks and
                        remote locations. This experience taught me valuable lessons about adapting to
                        different working environments and maintaining productivity while on the move.</p>
                        <p><strong>Tech setup:</strong> Created a comprehensive mobile workstation in my vehicle
                        with power inverters, connectivity solutions, and ergonomic considerations.</p>
                    </div>
                `
            },
        ]
    }
};

// Export the content object
export { portfolioContent };