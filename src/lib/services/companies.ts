// src/lib/services/companies.ts

export interface CompanyMetadata {
  name: string
  about: string
  website: string
  techStack: string[]
  hiringProcess: string[]
  locations: string[]
  logoUrl?: string
}

const KNOWN_COMPANIES: Record<string, CompanyMetadata> = {
  flipkart: {
    name: 'Flipkart',
    about: 'Flipkart is India\'s leading e-commerce marketplace. Since starting in 2007, Flipkart has enabled millions of consumers, sellers, merchants, and small businesses to be a part of India\'s digital commerce revolution.',
    website: 'https://www.flipkart.com',
    techStack: ['Java', 'Spring Boot', 'React', 'Node.js', 'Cassandra', 'Hadoop'],
    hiringProcess: [
      'Online Coding Test (Data Structures & Algorithms)',
      'Technical Interview Round 1 (Problem Solving & Coding)',
      'Technical Interview Round 2 (System Design & LLD)',
      'HR / Cultural Fitment Interview'
    ],
    locations: ['Bangalore, Karnataka', 'Mumbai, Maharashtra', 'Delhi NCR']
  },
  razorpay: {
    name: 'Razorpay',
    about: 'Razorpay is the leading fintech platform in India, enabling businesses with suite-level payment solutions, banking services, and automated payroll systems. Powering over 10 million businesses nationwide.',
    website: 'https://razorpay.com',
    techStack: ['React', 'TypeScript', 'Go', 'PHP', 'AWS', 'Kubernetes', 'MySQL'],
    hiringProcess: [
      'Resume Shortlisting & Initial Screening Call',
      'Technical Frontend/Backend Assessment Test',
      'Technical Coding & System Design Interview',
      'Managerial Round & HR Fitment'
    ],
    locations: ['Bangalore, Karnataka', 'Remote, India']
  },
  swiggy: {
    name: 'Swiggy',
    about: 'Swiggy is India\'s leading on-demand convenience platform, operating a hyperlocal logistics network across food delivery, grocery quick commerce (Instamart), dining, and delivery services.',
    website: 'https://www.swiggy.com',
    techStack: ['Java', 'Go', 'React', 'Android', 'AWS', 'Microservices', 'PostgreSQL'],
    hiringProcess: [
      'Online Coding Test (DSA and Problem Solving)',
      'Technical Round 1 (System Architecture & Machine Coding)',
      'Technical Round 2 (Core Computer Science Fundamentals)',
      'HM & HR Round'
    ],
    locations: ['Bangalore, Karnataka', 'Gurgaon, Haryana']
  },
  zomato: {
    name: 'Zomato',
    about: 'Zomato is a technology platform connecting customers, restaurant partners, and delivery partners, serving dining, food delivery, and quick commerce services in multiple cities across India.',
    website: 'https://zomato.com',
    techStack: ['React', 'Next.js', 'Node.js', 'React Native', 'PostgreSQL', 'Redis'],
    hiringProcess: [
      'Portfolio/Resume Shortlisting',
      'Frontend / JavaScript Technical Assessment Challenge',
      'Interactive Frontend Architecture Interview',
      'HR Fitment & Offer Discussion'
    ],
    locations: ['Gurgaon, Haryana', 'Bangalore, Karnataka']
  },
  paytm: {
    name: 'Paytm',
    about: 'Paytm is India\'s pioneer digital payments and financial services company, offering consumers and merchants payment, commerce, and banking solutions.',
    website: 'https://paytm.com',
    techStack: ['Java', 'Node.js', 'React', 'MongoDB', 'Apache Kafka', 'Docker'],
    hiringProcess: [
      'Aptitude & Coding Assessment Test',
      'Technical Round 1 (Algorithms & OOPs)',
      'Technical Round 2 (DB Design & APIs)',
      'HR Fitment'
    ],
    locations: ['Noida, Uttar Pradesh', 'Bangalore, Karnataka']
  },
  reliancejio: {
    name: 'Reliance Jio',
    about: 'Reliance Jio Infocomm Limited, doing business as Jio, is an Indian telecommunications company and a subsidiary of Jio Platforms. It operates a national LTE network with coverage across all 22 telecom circles.',
    website: 'https://www.jio.com',
    techStack: ['Python', 'Django', 'AWS', 'Linux', 'Docker', 'Angular', 'Oracle'],
    hiringProcess: [
      'Aptitude & Technical MCQ Assessment',
      'Technical Interview Round 1 (Core Language & OOPs)',
      'Technical Interview Round 2 (System & DB Fundamentals)',
      'HR Interview'
    ],
    locations: ['Navi Mumbai, Maharashtra', 'Bangalore, Karnataka']
  },
  tcs: {
    name: 'TCS',
    about: 'Tata Consultancy Services is an IT services, consulting, and business solutions organization that has been partnering with many of the world\'s largest businesses for over 50 years.',
    website: 'https://www.tcs.com',
    techStack: ['Java', 'React', 'SQL', 'Python', 'Oracle', 'Spring Boot'],
    hiringProcess: [
      'TCS National Qualifier Test (NQT)',
      'Technical Interview (Coding & Project Discussion)',
      'Managerial Round (Scenario-based questions)',
      'HR Round'
    ],
    locations: ['Mumbai, Maharashtra', 'Pune, Maharashtra', 'Chennai, Tamil Nadu']
  },
  infosys: {
    name: 'Infosys',
    about: 'Infosys is a global leader in next-generation digital services and consulting. We enable clients in more than 50 countries to navigate their digital transformation.',
    website: 'https://www.infosys.com',
    techStack: ['Java', 'Angular', 'Spring Boot', 'MySQL', 'Python', 'AWS'],
    hiringProcess: [
      'System-based Hackathon or Aptitude Test (InfyTQ/HackWithInfy)',
      'Technical Interview (DSA & OOPs)',
      'HR Interview'
    ],
    locations: ['Pune, Maharashtra', 'Bangalore, Karnataka', 'Hyderabad, Telangana']
  }
}

export function getCompanyMetadata(companyName: string): CompanyMetadata {
  const normalizedKey = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  if (KNOWN_COMPANIES[normalizedKey]) {
    return KNOWN_COMPANIES[normalizedKey]
  }

  // Fallback metadata generator
  const slugifiedName = companyName.toLowerCase().replace(/\s+/g, '-')
  
  return {
    name: companyName,
    about: `${companyName} is an innovative enterprise building state-of-the-art products. They are scaling their software engineering teams to solve complex industry challenges and drive next-generation user experiences.`,
    website: `https://www.${slugifiedName}.io`,
    techStack: ['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL', 'Docker'],
    hiringProcess: [
      'Resume Shortlisting',
      'Take-Home Technical Challenge / Coding Test',
      'Technical Video Interview (System Architecture & Coding)',
      'HR & Executive Fitment Round'
    ],
    locations: ['Worldwide Remote', 'Hybrid / Onsite Options']
  }
}
