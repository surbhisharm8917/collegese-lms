import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { BRAND } from "@/lib/brand";
import { Link } from "react-router-dom";

export type LegalPageType = "privacy" | "terms" | "cookies" | "refund";

type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocument = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const content: Record<LegalPageType, LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    updated: "Effective 10 July 2026",
    intro:
      "This policy explains how personal data is collected, used, secured, retained, and shared when you use the Just Easy CA Classes website, learning platform, classes, assessments, and support channels.",
    sections: [
      {
        heading: "Who Is Responsible For Your Data",
        paragraphs: [
          `${BRAND.legalName} is the data fiduciary for personal data processed through this platform. Questions and rights requests can be sent to ${BRAND.grievanceEmail}.`,
        ],
      },
      {
        heading: "Data We Collect",
        bullets: [
          "Identity and account data, including name, learner ID, email, phone number, profile image, and encrypted account credentials.",
          "Learning data, including enrollments, attendance, video progress, quiz and exam attempts, submissions, marks, feedback, certificates, and course completion records.",
          "Classroom data, including live-room participation, join and leave times, chat or media you choose to publish, and recordings only where recording is expressly enabled and disclosed.",
          "Support and communication data, including requests, complaint references, email correspondence, and notification delivery details.",
          "Security and technical data, including session identifiers, IP address, browser or device information, request identifiers, and security events.",
        ],
      },
      {
        heading: "Why We Process Data",
        bullets: [
          "Create and secure accounts, verify email addresses, authenticate sessions, and prevent fraud or misuse.",
          "Deliver enrolled courses, live and recorded classes, assessments, examinations, grading, progress reports, and certificates.",
          "Send essential service messages such as verification, password reset, class, assessment, result, security, and support updates.",
          "Operate, troubleshoot, audit, and improve the reliability, accessibility, and security of the platform.",
          "Meet contractual, accounting, consumer-protection, legal, and regulatory obligations and respond to lawful requests.",
        ],
      },
      {
        heading: "Service Providers And Transfers",
        paragraphs: [
          "We use contracted infrastructure, storage, live-video, email, and operational service providers only as needed to run the platform. Depending on the active deployment, data may be processed using Microsoft Azure, Amazon Web Services, LiveKit, and an approved email provider. We require appropriate safeguards and do not sell personal data.",
          "Some providers may process data outside your state or country. We apply contractual and technical safeguards and follow any transfer restrictions applicable under Indian law.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Controls include encrypted HTTPS transport, hashed passwords and security tokens, HTTP-only authentication cookies, CSRF protection, role-based access, private storage for learning files, short-lived media links, audit identifiers, rate limiting, backups, and restricted administrative access. No system can guarantee absolute security; suspected incidents should be reported immediately through the grievance channel.",
        ],
      },
      {
        heading: "Retention And Deletion",
        paragraphs: [
          "We retain account and learning records while an account or enrollment remains active and for the period reasonably required for education records, certificate verification, disputes, fraud prevention, backup recovery, and legal compliance. Expired sessions and temporary security tokens are removed on a scheduled basis. Backups expire under the active cloud retention schedule.",
          "When deletion is requested, we erase or de-identify data that is no longer required. Some records may be retained where necessary to comply with law, establish or defend legal claims, prevent fraud, or preserve the validity of an issued certificate.",
        ],
      },
      {
        heading: "Your Choices And Rights",
        bullets: [
          "Access a summary of personal data and processing information associated with your account.",
          "Correct, complete, or update inaccurate personal data through your profile or a verified request.",
          "Request erasure of data that is no longer required, subject to lawful retention obligations.",
          "Withdraw optional consent without affecting processing already lawfully completed.",
          "Raise a grievance and, where applicable, nominate another person to exercise rights on your behalf.",
        ],
        paragraphs: [
          "Submit a verified request through the Grievance and Support page. We may request information needed to confirm identity before acting on a request.",
        ],
      },
      {
        heading: "Learners Under 18",
        paragraphs: [
          "Public self-registration is limited to people aged 18 or older. A learner under 18 must be enrolled through a guardian or an authorized institute process that records the required consent. Minors should not submit a public registration form independently.",
        ],
      },
      {
        heading: "Changes And Contact",
        paragraphs: [
          "We may update this policy when the service or applicable law changes. Material changes will be communicated through the platform or registered email where appropriate. The effective date above identifies the current version.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "Effective 10 July 2026",
    intro:
      "These terms govern access to the Just Easy CA Classes website, learning platform, course content, live classes, assessments, certificates, and support services.",
    sections: [
      {
        heading: "Agreement And Eligibility",
        paragraphs: [
          `The service is operated by ${BRAND.legalName}. By creating an account or using the service, you agree to these terms and the Privacy Policy. Public self-registration is for people aged 18 or older; minors require a guardian or authorized institute enrollment process.`,
        ],
      },
      {
        heading: "Accounts And Access",
        bullets: [
          "Provide accurate information and keep it current.",
          "Keep credentials private and notify us promptly about suspected unauthorized access.",
          "Use only the role, courses, and records assigned to you. Accounts and course access may not be shared, transferred, rented, or resold.",
          "We may revoke sessions, require a password change, or restrict an account to protect learners and the service.",
        ],
      },
      {
        heading: "Courses, Live Classes, And Recordings",
        paragraphs: [
          "Enrollment provides a limited, personal, non-transferable right to access the applicable course during the stated access period. Schedules, instructors, and sequencing may change for academic or operational reasons. Live-class recording, where enabled, will be disclosed. Participants must not record, rebroadcast, or distribute a class without written permission.",
        ],
      },
      {
        heading: "Academic Integrity",
        paragraphs: [
          "Assessments and examinations must be attempted honestly. Impersonation, answer sharing, unauthorized assistance, tampering, bypassing proctoring controls, or misuse of another account may result in attempt cancellation, review, suspension, or termination. Automated scores may be reviewed or corrected where a technical or evaluation error is confirmed.",
        ],
      },
      {
        heading: "Payments And Refunds",
        paragraphs: [
          "Fees, taxes, access duration, installment terms, and included services are shown in the applicable order, invoice, or enrollment confirmation. Payment processing may be handled by an approved provider. Refund eligibility is governed by the Refund and Cancellation Policy and any course-specific terms disclosed before purchase.",
        ],
      },
      {
        heading: "Acceptable Use",
        bullets: [
          "Do not upload unlawful, infringing, deceptive, abusive, malicious, or privacy-invasive material.",
          "Do not probe security, evade access controls, scrape the service, interfere with classes, or disrupt infrastructure.",
          "Do not copy, publish, sell, or create unauthorized derivative material from classes, notes, tests, recordings, branding, or software.",
          "Respect teachers, learners, staff, and third-party rights in every communication and live classroom.",
        ],
      },
      {
        heading: "Intellectual Property",
        paragraphs: [
          "The platform, brand, course materials, recordings, question banks, documents, and software are owned by or licensed to us. No ownership transfers to a learner. Content you submit remains yours, but you grant us the limited rights required to store, display, evaluate, and administer it for the service.",
        ],
      },
      {
        heading: "Availability And Educational Disclaimer",
        paragraphs: [
          "We work to provide a reliable service but may perform maintenance, respond to incidents, or change features. Just Easy CA Classes is an independent education provider and is not presented as the Institute of Chartered Accountants of India. Course access does not guarantee examination eligibility, rank, employment, or a particular result; learners remain responsible for checking current ICAI rules and deadlines.",
        ],
      },
      {
        heading: "Suspension And Termination",
        paragraphs: [
          "We may suspend or terminate access for material breach, non-payment, fraud, security risk, academic misconduct, unlawful use, or where required by law. You may request account closure through support. Clauses concerning payments, intellectual property, records, liability, and disputes survive where their nature requires it.",
        ],
      },
      {
        heading: "Liability And Governing Law",
        paragraphs: [
          "To the extent permitted by law, neither party is liable for indirect or consequential loss. Nothing in these terms excludes rights or liability that cannot lawfully be excluded, including applicable consumer rights. These terms are governed by the laws of India, and courts having jurisdiction over our registered office will have jurisdiction, subject to mandatory consumer forums and dispute-resolution rights.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: "Effective 10 July 2026",
    intro:
      "This policy describes the cookies and browser storage used to secure accounts and operate the learning platform.",
    sections: [
      {
        heading: "Essential Cookies",
        bullets: [
          "auth_token: an HTTP-only, secure authentication cookie used to maintain a signed-in session. It normally expires after one hour or when you log out.",
          "jecc_csrf: a signed anti-forgery cookie used to protect state-changing requests. It normally expires after twelve hours.",
        ],
        paragraphs: [
          "These cookies are required for secure account functionality and cannot be disabled inside the platform. Blocking them in the browser prevents login and authenticated actions.",
        ],
      },
      {
        heading: "Local Browser Storage",
        paragraphs: [
          "The interface may store non-secret display preferences and a limited cached user view used for navigation. Authentication tokens are not stored in localStorage. Clearing site data signs you out and resets local preferences.",
        ],
      },
      {
        heading: "Analytics And Advertising",
        paragraphs: [
          "The current platform does not enable advertising cookies or non-essential cross-site tracking by default. If optional analytics or marketing technology is introduced, this policy and the consent controls will be updated before those cookies are activated where consent is required.",
        ],
      },
      {
        heading: "Managing Cookies",
        paragraphs: [
          "You can inspect, block, or delete cookies using browser settings. Essential learning and account features may stop working after cookies are blocked or removed.",
        ],
      },
    ],
  },
  refund: {
    title: "Refund And Cancellation Policy",
    updated: "Effective 10 July 2026",
    intro:
      "This policy applies to paid digital course enrollments purchased directly from Just Easy CA Classes through an authorized payment channel.",
    sections: [
      {
        heading: "Before You Purchase",
        paragraphs: [
          "Review the course title, syllabus, faculty, schedule, access period, technical requirements, fees, taxes, and any course-specific refund terms shown in the order or invoice. Course-specific terms disclosed before payment take precedence where they provide clearer or more favorable rights.",
        ],
      },
      {
        heading: "Learner Cancellation",
        paragraphs: [
          "A refund request may be submitted within seven calendar days of payment when the learner has not attended a live class, watched or downloaded substantial course material, attempted an assessment, or received a certificate. Approved refunds may exclude a clearly disclosed, non-refundable payment-processing charge to the extent permitted by law.",
          "After substantial digital access begins, fees are generally non-refundable unless the service is materially different from what was purchased or applicable law requires a refund. Access remains active while a disputed request is reviewed unless misuse or a payment reversal requires restriction.",
        ],
      },
      {
        heading: "Duplicate, Failed, Or Unauthorized Payments",
        paragraphs: [
          "Confirmed duplicate charges and payments debited for an enrollment that was not created will be refunded in full to the original payment method. Report suspected unauthorized payments promptly to both your bank or payment provider and our support team.",
        ],
      },
      {
        heading: "Cancellation By Us",
        paragraphs: [
          "If we cancel a paid course and cannot provide a reasonable replacement or transfer accepted by the learner, the unused portion will be refunded. Temporary schedule changes, instructor substitutions, planned maintenance, or a learner's device or connectivity issue do not by themselves constitute course cancellation.",
        ],
      },
      {
        heading: "How To Request And Receive A Refund",
        bullets: [
          "Submit a request through the Grievance and Support page using the registered email and include the payment or order reference, course, payment date, and reason.",
          "We may request evidence needed to verify the payment and account holder.",
          "Approved refunds are sent to the original payment method. Bank and payment-provider processing times apply after we initiate the refund.",
        ],
      },
      {
        heading: "Consumer Rights",
        paragraphs: [
          "Nothing in this policy limits a mandatory right available under applicable consumer law. A rejected request can be escalated through the grievance process with the original support reference.",
        ],
      },
    ],
  },
};

const LegalPage = ({ type }: { type: LegalPageType }) => {
  const page = content[type];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-slate-100 bg-slate-50">
          <div className="mx-auto max-w-4xl px-6 py-14">
            <p className="text-sm font-semibold uppercase text-orange-600">{page.updated}</p>
            <h1 className="mt-3 text-4xl font-extrabold text-[#072A60] sm:text-5xl">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{page.intro}</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-12">
          <div className="space-y-9">
            {page.sections.map((section) => (
              <article
                key={section.heading}
                className="border-b border-slate-100 pb-9 last:border-0"
              >
                <h2 className="text-xl font-semibold text-slate-950">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-600">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-4 space-y-2 pl-5 text-sm leading-7 text-slate-600">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="list-disc pl-1 marker:text-orange-500">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          <aside className="mt-10 border-l-4 border-orange-500 bg-orange-50 p-5 text-sm leading-6 text-slate-700">
            Questions, rights requests, cancellations, and complaints can be submitted through the{" "}
            <Link to="/grievance" className="font-semibold text-orange-700 underline">
              Grievance and Support page
            </Link>{" "}
            or by email at{" "}
            <a href={`mailto:${BRAND.grievanceEmail}`} className="font-semibold text-orange-700">
              {BRAND.grievanceEmail}
            </a>
            .
          </aside>

          {(BRAND.legalAddress || BRAND.cin || BRAND.gstin) && (
            <div className="mt-8 text-xs leading-6 text-slate-500">
              <strong className="text-slate-700">{BRAND.legalName}</strong>
              {BRAND.legalAddress && <div>{BRAND.legalAddress}</div>}
              {BRAND.cin && <div>CIN: {BRAND.cin}</div>}
              {BRAND.gstin && <div>GSTIN: {BRAND.gstin}</div>}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
