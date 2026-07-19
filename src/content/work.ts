import type { SystemContent } from './types'

export const WORK: SystemContent = {
  id: 'work-experience',
  name: 'Work Experience',
  starColor: '#FF9D00',
  overview: 'My professional journey and career highlights across various roles and companies.',
  items: [
    {
      title: 'Senior AI Engineer',
      subtitle: 'Suzega · June 2025 – May 2026',
      tech: 'Python, FastAPI, PostgreSQL, TypeScript, React, Claude (Anthropic), OpenAI, Vertex AI, Azure, Pydantic, Alembic, Langfuse',
      overview: 'Primary architect of an AI platform powering 30+ enterprise agents at Suzega (2025-2026)',
      bullets: [
        'Contributed to $1.47M+ in revenue by solely designing and shipping an enterprise insurance underwriting vertical — productising agents, prompts, and workflows into a sales-ready solution spanning 15 autonomous agents across 6 workflows.',
        'Built an autonomous cash reconciliation system for an enterprise B2B distributor, correlating 7 heterogeneous sources (ERP API, scanned PDFs, bank statements, payment processor) across 5 branches daily — achieving a 93% automated match rate with a deterministic matching engine.',
        'Reduced underwriting research turnaround from 2–3 days to under 1 hour by architecting a production AI Research Agent that autonomously aggregates and correlates data from bureau sources, public records, loss runs, and internal systems.',
        'Built a production observability platform as part of the Ithara platform team — capturing token usage, latency, tool-call success rates, and cost-per-request across 30+ enterprise agentic applications.',
        "Engineered the Ithara platform's core agent loop engine powering 30+ production agents across enterprise clients — prompt chaining, tool-use loops, orchestrator-worker patterns, self-correcting retry logic, and a self-healing sweeper.",
        'Turned a fully manual daily reconciliation process — an estimated 10–15 hours/week of spreadsheet work — into a one-click autonomous pipeline triggered from Outlook, eliminating manual data gathering and freeing the accounting team for higher-value work.',
      ],
    },
    {
      title: 'Senior Software Engineer',
      subtitle: 'CyberFortress · March 2024 – March 2025',
      tech: 'Python, TypeScript, Next.js, PostgreSQL, GCP (Cloud Run, GCS, Cloud SQL), Docker',
      overview: 'Cloud-native Python apps and integration platforms at CyberFortress (2024-2025)',
      bullets: [
        'Automated a legacy data repair process that consumed 150+ hours/month of manual work by architecting a cloud-native Python application on GCP end-to-end.',
        'Built an integration platform (Python, TypeScript, Next.js, PostgreSQL, GCP) unifying customer usage data across 25+ disparate products — replacing manual reporting with automated dashboards.',
        'Consolidated invoice processing across 25+ products into a self-service portal (TypeScript, Next.js, SQL); slashed manual processing by 200+ hours monthly.',
        'Stabilized multiple legacy systems with zero documentation — reverse-engineering codebases, diagnosing cross-system bugs, and restoring platform reliability.',
      ],
    },
    {
      title: 'Co-founder & CTO',
      subtitle: 'Amigo · November 2023 – October 2024',
      tech: 'Node.js, Express, MongoDB, Redis, Docker, Jenkins, Jest',
      overview: 'Building cool stuff at Amigo (2023-2024)',
      bullets: [
        'Recruited and managed a team of 5 junior engineers, mentoring them in technical and architectural best practices.',
        'Acted as the technical decision-maker, overseeing all product development (React Native, Typescript, Nest.js, Upstash Queue NextJS, MongoDB), deployment (GitHub Actions), and scalability aspects.',
        'Fixed critical authentication and expense ledger issues, saving $1,000/month in Firebase costs by repairing SMS OTP login, implementing a mock authentication system, and rebuilding the chat-based expense ledger, transforming it from unusable to seamless.',
        'Shaped product direction and improved UX by collaborating with business, marketing, and design teams and leading real-world beta testing with industry experts and power users, refining the app based on their insights.',
      ],
    },
    {
      title: 'Software Engineer',
      subtitle: 'Appleute · February 2022 – August 2023',
      tech: 'React Native, TypeScript, Nest.js, Node.js, MongoDB, REST APIs',
      overview: 'Built mobile and web backbone at Appleute (2022-2023)',
      bullets: [
        "Architected and developed the front-end of PUMA's Employee App CATch Up (Android, iOS), utilizing React Native and TypeScript; serving 50,000+ employees worldwide.",
        "Transformed the company's engineering culture by establishing a robust frontend engineering core and introducing best practices adopted by 6 engineers and 5+ projects, enhancing UI consistency, cutting development time, and minimizing UI bugs.",
        'Guided 4 interns through intensive software engineering projects, fostering skill growth; 2 secured full-time positions and spearheaded critical projects, demonstrating mentorship effectiveness and team contribution.',
        'Single-handedly built the entire v1 pixel-perfect front end of Bücherbüchse (React Native and TypeScript) - an Instagram-like social media app for book readers (Android, iOS).',
        'Designed and built Bücherbüchse‘s multiple core services (books, reviews, users, comments, content, notifications, etc.) in a distributed backend, currently serving over 23,000 users.',
        'Overhauled legacy code, boosting feature development efficiency by 90%, streamlining the onboarding process for new developers, and fostering team collaboration.',
      ],
    },
    {
      title: 'Fullstack Engineer',
      subtitle: 'Down For Coffee · January 2021 – July 2021',
      tech: 'React, Redux, LESS, Node.js, AWS Serverless, Slack API',
      overview: 'Frontend lead in a one-man frontend team at Down For Coffee (2021)',
      bullets: [
        'Developed and implemented the entire front-end architecture using React/Redux and LESS, translating intricate UI/UX Figma design specifications into a visually captivating SPA.',
        'Created multiple third-party integrations (calendar, HR software, etc.) in Node.js using Serverless architecture (deployed in AWS).',
        'Engineered a highly efficient Slack bot using Node.js, granting users access to essential dashboard features directly within the Slack interface; eliminated the need for repeated logins, optimizing workflow, and reducing friction.',
      ],
    },
    {
      title: 'Code Reviewer',
      subtitle: 'Microverse · June 2020 – December 2020',
      tech: 'JavaScript, React, Ruby, Ruby on Rails, HTML/CSS',
      overview: 'Mentoring juniors started at Microverse (2020)',
      bullets: [
        'Analyzed 400+ student code submissions, identifying vulnerabilities and logic errors; offered personalized feedback to elevate code quality and comprehension of software engineering principles for each student.',
        'Mentored and guided a team of junior web developers, through regular 1:1 video calls, conducting comprehensive code reviews and providing technical support.',
      ],
    },
  ],
}
