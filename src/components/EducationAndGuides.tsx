import { BookOpen, Mail, FileText, MapPin } from "lucide-react";

const resources = [
  {
    icon: BookOpen,
    title: "How to DADU Guide",
    description: "Step-by-step guidance through the DADU development process in Seattle.",
  },
  {
    icon: Mail,
    title: "Newsletter",
    description: "Occasional updates on zoning changes, design insights, and development considerations.",
  },
  {
    icon: FileText,
    title: "Case studies",
    description: "Real projects and how they moved from feasibility to permit-ready.",
  },
  {
    icon: MapPin,
    title: "Seattle zoning updates",
    description: "Changes to Seattle's middle housing regulations and what they mean for investors.",
  },
];

export function EducationAndGuides() {
  return (
    <section id="education" className="py-20 md:py-28 border-t border-[var(--border)]">
      <div className="mx-auto max-w-5xl px-6 md:px-12">
        <h2 className="font-serif text-2xl md:text-3xl font-medium tracking-tight text-[var(--foreground)] mb-4">
          Learning the DADU process
        </h2>
        <p className="text-[var(--muted-foreground)] leading-relaxed max-w-2xl mb-16">
          We share what we learn. Guides, case studies, and updates to help you
          understand middle housing development in Seattle.
        </p>

        <div className="grid sm:grid-cols-2 gap-8">
          {resources.map((item) => (
            <div
              key={item.title}
              className="group border border-[var(--border)] rounded-xl p-6 hover:border-[var(--primary)]/30 transition-colors bg-[var(--card)]"
            >
              <div className="size-10 rounded-lg bg-[var(--muted)] flex items-center justify-center mb-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                <item.icon className="size-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif font-medium text-[var(--foreground)] mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
