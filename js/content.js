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
                name: "Space Portfolio",
                color: "#33FF57",
                overview: "This interactive space-themed portfolio",
                details: `
                    <h3>Space Portfolio</h3>
                    
                    <h4>Project Overview</h4>
                    <p>An interactive, space-themed portfolio website that visualizes different sections of my
                    professional profile as star systems and planets that can be explored in a gamified experience.</p>
                    
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
            },
            {
                name: "AI Chat App",
                color: "#00A86B",
                overview: "Real-time chat application with AI suggestions",
                details: `
                    <h3>AI-Enhanced Chat Application</h3>
                    
                    <h4>Project Overview</h4>
                    <p>A modern chat application that uses AI to provide smart reply suggestions,
                    message summarization, and language translation features.</p>
                    
                    <h4>Technologies</h4>
                    <ul>
                        <li>React.js for frontend with styled-components</li>
                        <li>Firebase for authentication and real-time database</li>
                        <li>OpenAI API for AI-powered features</li>
                        <li>WebSocket for real-time communication</li>
                    </ul>
                    
                    <h4>Key Features</h4>
                    <ul>
                        <li>Real-time messaging with read receipts</li>
                        <li>Smart reply suggestions based on conversation context</li>
                        <li>Conversation summarization for long chats</li>
                        <li>Multi-language support with automatic translation</li>
                        <li>User presence indicators and typing notifications</li>
                    </ul>
                    
                    <h4>Links</h4>
                    <p>
                        <a href="https://ai-chat-demo.netlify.app" target="_blank">Live Demo</a> |
                        <a href="https://github.com/yourusername/ai-chat-app" target="_blank">GitHub Repository</a>
                    </p>
                `
            },
            {
                name: "Recipe Finder",
                color: "#4B7F52",
                overview: "Web app that helps find recipes based on available ingredients",
                details: `
                    <h3>Recipe Finder</h3>
                    
                    <h4>Project Overview</h4>
                    <p>A web application that helps users find recipes based on ingredients they already have,
                    reducing food waste and making meal planning easier.</p>
                    
                    <h4>Technologies</h4>
                    <ul>
                        <li>Vue.js 3 with Composition API</li>
                        <li>Tailwind CSS for styling</li>
                        <li>Express.js backend with MongoDB</li>
                        <li>Spoonacular API integration for recipe data</li>
                    </ul>
                    
                    <h4>Key Features</h4>
                    <ul>
                        <li>Ingredient-based recipe search</li>
                        <li>Dietary restrictions and preference filters</li>
                        <li>Personalized recipe recommendations</li>
                        <li>Shopping list generation for missing ingredients</li>
                        <li>User accounts to save favorite recipes</li>
                    </ul>
                    
                    <h4>Links</h4>
                    <p>
                        <a href="https://recipe-finder.herokuapp.com" target="_blank">Live Demo</a> |
                        <a href="https://github.com/yourusername/recipe-finder" target="_blank">GitHub Repository</a>
                    </p>
                `
            },
            {
                name: "Budget Tracker",
                color: "#98FB98",
                overview: "Personal finance tracking application",
                details: `
                    <h3>Budget Tracker</h3>
                    
                    <h4>Project Overview</h4>
                    <p>A comprehensive personal finance application that helps users track expenses,
                    set budgets, and visualize spending patterns.</p>
                    
                    <h4>Technologies</h4>
                    <ul>
                        <li>React Native for cross-platform mobile development</li>
                        <li>Redux for state management</li>
                        <li>Firebase for authentication and data storage</li>
                        <li>Chart.js for financial data visualization</li>
                    </ul>
                    
                    <h4>Key Features</h4>
                    <ul>
                        <li>Expense and income tracking with categories</li>
                        <li>Monthly budget setting and progress tracking</li>
                        <li>Interactive charts and reports for spending analysis</li>
                        <li>Receipt scanning with OCR</li>
                        <li>Recurring transaction management</li>
                        <li>Export functionality for financial data</li>
                    </ul>
                    
                    <h4>Links</h4>
                    <p>
                        <a href="https://github.com/yourusername/budget-tracker" target="_blank">GitHub Repository</a>
                    </p>
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
        overview: "Professional recommendations and testimonials from colleagues and clients.",
        planets: [
            {
                name: "CEO Testimonial",
                color: "#F3FF33",
                overview: "From Jane Doe, CEO at XYZ Corp",
                details: `
                    <h3>Recommendation from Jane Doe</h3>
                    <p class="title-company">CEO at XYZ Corporation</p>
                    
                    <div class="testimonial">
                        <p>"An exceptional developer who consistently goes above and beyond expectations.
                        Their technical expertise combined with excellent communication skills made complex projects
                        run smoothly. Their contributions to our cloud migration strategy were invaluable,
                        and they demonstrated remarkable leadership when guiding the development team through
                        challenging technical obstacles. I would not hesitate to work with them again on
                        mission-critical initiatives."</p>
                    </div>
                    
                    <div class="recommendation-date">
                        <p>January 2025</p>
                    </div>
                `
            },
            {
                name: "Team Lead Review",
                color: "#FFCC33",
                overview: "From John Smith, Lead Developer",
                details: `
                    <h3>Recommendation from John Smith</h3>
                    <p class="title-company">Lead Developer at ABC Software</p>
                    
                    <div class="testimonial">
                        <p>"I had the pleasure of working directly with this developer for over two years.
                        Their problem-solving abilities and attention to detail are truly impressive.
                        They consistently delivered high-quality code ahead of schedule and became the go-to
                        person for particularly complex technical challenges. Beyond their technical skills,
                        they were an excellent mentor to junior developers and contributed significantly to
                        improving our development processes. Any team would be fortunate to have them on board."</p>
                    </div>
                    
                    <div class="recommendation-date">
                        <p>October 2024</p>
                    </div>
                `
            }
        ]
    },
    
    // Current Reading Star System
    reading: {
        id: "current-reads",
        name: "Current Reading",
        starColor: "#FF33F6", // Purple star
        overview: "Books and articles I'm currently reading or have recently finished.",
        planets: [
            {
                name: "Clean Architecture",
                color: "#FF33F6",
                overview: "Clean Architecture by Robert C. Martin - My notes and takeaways",
                details: `
                    <h3>Clean Architecture by Robert C. Martin</h3>
                    <div class="book-details">
                        <p><strong>Author:</strong> Robert C. Martin</p>
                        <p><strong>Status:</strong> Completed in March 2025</p>
                        <p><strong>Rating:</strong> ★★★★★</p>
                    </div>
                    
                    <h4>Key Takeaways</h4>
                    <ul>
                        <li>The importance of separating business logic from delivery mechanisms</li>
                        <li>How to structure applications around use cases rather than technical frameworks</li>
                        <li>Practical implementations of the dependency inversion principle</li>
                        <li>Strategies for creating maintainable and testable architecture</li>
                        <li>How to make architectural decisions that stand the test of time</li>
                    </ul>
                    
                    <h4>How I've Applied These Concepts</h4>
                    <p>I've implemented Clean Architecture principles in my recent projects,
                    particularly focusing on creating clear boundaries between layers and ensuring
                    business logic remains independent of frameworks. This has resulted in more
                    testable code and greater flexibility when adapting to changing requirements.</p>
                    
                    <p><a href="https://www.goodreads.com/book/show/18043011-clean-architecture" target="_blank">View on Goodreads →</a></p>
                `
            },
            {
                name: "Deep Work",
                color: "#DA70D6",
                overview: "Deep Work by Cal Newport - Strategies I'm implementing",
                details: `
                    <h3>Deep Work by Cal Newport</h3>
                    <div class="book-details">
                        <p><strong>Author:</strong> Cal Newport</p>
                        <p><strong>Status:</strong> Currently reading</p>
                        <p><strong>Progress:</strong> 75% complete</p>
                    </div>
                    
                    <h4>What I've Learned So Far</h4>
                    <ul>
                        <li>The distinction between deep work and shallow work</li>
                        <li>How the ability to focus deeply is becoming increasingly valuable</li>
                        <li>Practical techniques for scheduling and protecting deep work time</li>
                        <li>Strategies for reducing distraction and building concentration</li>
                        <li>The importance of deliberate rest in maintaining deep work capacity</li>
                    </ul>
                    
                    <h4>Strategies I'm Implementing</h4>
                    <p>I've begun scheduling dedicated deep work blocks in my calendar,
                    implementing a "shutdown ritual" at the end of each workday, and
                    measuring my deep work hours as a key productivity metric. I've already
                    noticed improvements in my ability to tackle complex programming challenges
                    and maintain focus for longer periods.</p>
                    
                    <p><a href="https://www.goodreads.com/book/show/25744928-deep-work" target="_blank">View on Goodreads →</a></p>
                `
            }
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
                name: "Sci-Fi Series",
                color: "#33FFF3",
                overview: "My thoughts on the latest season of [Show Name]",
                details: `
                    <h3>The Expanse - Final Season</h3>
                    <div class="show-details">
                        <p><strong>Genre:</strong> Science Fiction</p>
                        <p><strong>Status:</strong> Completed</p>
                        <p><strong>Rating:</strong> ★★★★★</p>
                    </div>
                    
                    <h4>Why I Love This Show</h4>
                    <p>As a software developer with an interest in space and physics, The Expanse
                    stands out for its realistic portrayal of space travel, gravity, and the political
                    complexities of a solar system-wide civilization. The attention to scientific detail
                    and realistic technology projections make this series uniquely compelling.</p>
                    
                    <h4>Technical Aspects I Appreciate</h4>
                    <ul>
                        <li>Realistic orbital mechanics and space travel physics</li>
                        <li>Thoughtful portrayal of how technology shapes society</li>
                        <li>Plausible near-future computer interfaces and communication systems</li>
                        <li>The "slow AI" concept and its realistic development path</li>
                    </ul>
                    
                    <p>This series has influenced some of my UI design thinking and how I consider
                    the long-term implications of the technologies we develop today.</p>
                `
            },
            {
                name: "Tech Documentaries",
                color: "#40E0D0",
                overview: "Fascinating tech documentaries I've watched",
                details: `
                    <h3>Recent Tech Documentaries I Recommend</h3>
                    
                    <div class="documentary-item">
                        <h4>AlphaGo (2017)</h4>
                        <p>This documentary follows the DeepMind AI team as they develop AlphaGo and
                        challenge world champion Lee Sedol. As a developer interested in machine learning,
                        I found the portrayal of both the technical challenges and human elements fascinating.</p>
                        <p><strong>Key insight:</strong> The moment when AlphaGo makes "Move 37" - a move so
                        creative that commentators initially thought it was a mistake - represents a turning
                        point in how we understand AI capabilities.</p>
                    </div>
                    
                    <div class="documentary-item">
                        <h4>The Social Dilemma (2020)</h4>
                        <p>This documentary examines the impact of social media on society through interviews
                        with former executives from major tech companies. As someone who builds digital products,
                        it provoked important reflection on ethical design principles and unintended consequences.</p>
                        <p><strong>Key insight:</strong> The discussion of how engagement-based algorithms can
                        unintentionally promote divisive content has influenced how I approach recommendation
                        systems in my own work.</p>
                    </div>
                    
                    <div class="documentary-item">
                        <h4>Coded Bias (2020)</h4>
                        <p>An exploration of algorithmic bias and the real-world implications of flawed AI systems.
                        This documentary reinforced the importance of diverse training data and careful testing
                        in any machine learning project.</p>
                        <p><strong>Key insight:</strong> The practical examples of bias in facial recognition
                        systems highlighted how seemingly objective systems can perpetuate and amplify existing biases.</p>
                    </div>
                `
            }
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
                name: "Europe",
                color: "#C433FF",
                overview: "My adventures through various European countries",
                details: `
                    <h3>European Adventures</h3>
                    
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
                name: "Asia",
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
                name: "Americas",
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
            }
        ]
    }
};

// Export the content object
export { portfolioContent };