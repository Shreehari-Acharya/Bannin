"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

function StaggerCard({ index, children }: { index: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, index * 150);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: "translateY(40px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
    >
      {children}
    </div>
  );
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: "transform 0.15s ease-out", transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  const team = [
    {
      name: "Shreehari",
      role: "Back-End Developer",
      img: "assets/images/shreehari.jpg",
      github: "https://github.com/Shreehari-Acharya",
      linkedin: "https://www.linkedin.com/in/shreehari-acharya/",
      x: "",
    },
    import Image from "next/image";
    import Link from "next/link";
    import { FaGithub, FaLinkedin } from "react-icons/fa";
    import { FaXTwitter } from "react-icons/fa6";

    import { Badge } from "@/components/ui/badge";
    import { Button } from "@/components/ui/button";

    type TeamMember = {
      name: string;
      role: string;
      img: string;
      github: string;
      linkedin: string;
      x: string;
    };

    const team: TeamMember[] = [
      {
        name: "Shreehari",
        role: "Backend Developer",
        img: "/assets/images/shreehari.jpg",
        github: "https://github.com/Shreehari-Acharya",
        linkedin: "https://www.linkedin.com/in/shreehari-acharya/",
        x: "",
      },
      {
        name: "Binit Gupta",
        role: "Backend Developer",
        img: "/assets/images/binit.jpg",
        github: "https://github.com/binit2-1",
        linkedin: "https://www.linkedin.com/in/binitgupta",
        x: "https://x.com/BinitGupta21",
      },
      {
        name: "Gourish Mokashi",
        role: "Frontend Developer",
        img: "/assets/images/gourish.jpeg",
        github: "https://github.com/gourish-mokashi",
        linkedin: "https://www.linkedin.com/in/gourish-mokashi",
        x: "https://x.com/GourishMokashi",
      },
      {
        name: "Sanjana Patil",
        role: "Frontend Developer",
        img: "/assets/images/sanjana.jpg",
        github: "https://github.com/Sanjana0019",
        linkedin: "https://www.linkedin.com/in/sanjana-patil-dev",
        x: "https://x.com/sanjana_p0019",
      },
    ];

    const pillars = [
      {
        title: "Ingest",
        text: "Bring together alerts from supported tools without changing the event contract.",
      },
      {
        title: "Analyze",
        text: "Keep queue state, priority, and report generation tied to each incident.",
      },
      {
        title: "Report",
        text: "Expose the same downloadable outputs with a much clearer review flow.",
      },
    ];

    export default function AboutPage() {
      return (
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="space-y-6">
              <Badge variant="outline" className="w-fit border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                About Bannin
              </Badge>
              <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight text-white sm:text-6xl">
                Built to turn noisy security events into clear action.
              </h1>
              <p className="max-w-3xl text-balance text-lg leading-8 text-slate-300">
                Bannin is a focused operations view for monitoring, analyzing, and
                documenting incidents in one place. The interface keeps the response
                flow visible so teams can move from detection to resolution without
                losing context.
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">What changed</p>
              <h2 className="text-2xl font-semibold text-white">Dark, calm, and operational</h2>
              <p className="text-sm leading-7 text-slate-300">
                The refactor keeps the incident API and analysis workflow intact while
                replacing the old bright, table-first screens with a dashboard-like
                shell that is easier to scan.
              </p>
              <Button asChild className="mt-2 w-fit">
                <Link href="/events/all">Inspect incidents</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pillars.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-xl"
              >
                <p className="text-xs uppercase tracking-[0.32em] text-sky-200/70">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Technology</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Built on a clean, predictable stack</h2>
              <div className="mt-5 grid gap-3 text-sm leading-7 text-slate-300">
                <p>Frontend: Next.js, React, TypeScript, Tailwind CSS</p>
                <p>Backend: Node.js API routes and server adapters</p>
                <p>Data handling: JSON-backed event storage and polling</p>
                <p>Reporting: Automated PDF generation and links</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Team</p>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {team.map((person) => (
                  <article
                    key={person.name}
                    className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-lg shadow-black/20 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div className="relative h-72 overflow-hidden">
                      <Image
                        src={person.img}
                        alt={person.name}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    </div>
                    <div className="space-y-3 p-5">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{person.name}</h3>
                        <p className="text-sm text-slate-400">{person.role}</p>
                      </div>
                      <div className="flex items-center gap-4 text-lg text-slate-200">
                        <a href={person.github} target="_blank" rel="noreferrer" aria-label={`${person.name} GitHub`}>
                          <FaGithub className="transition-colors hover:text-cyan-300" />
                        </a>
                        <a href={person.linkedin} target="_blank" rel="noreferrer" aria-label={`${person.name} LinkedIn`}>
                          <FaLinkedin className="transition-colors hover:text-sky-300" />
                        </a>
                        {person.x ? (
                          <a href={person.x} target="_blank" rel="noreferrer" aria-label={`${person.name} X profile`}>
                            <FaXTwitter className="transition-colors hover:text-white" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
