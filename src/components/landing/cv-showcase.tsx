'use client';

import { Badge } from '@/components/ui/badge';

// Sample CV preview that mimics the actual generated CV style
export function CVShowcase() {
  return (
    <div className="relative">
      {/* Browser mockup frame */}
      <div className="bg-muted rounded-lg border shadow-2xl overflow-hidden">
        {/* Browser top bar */}
        <div className="bg-muted-foreground/10 px-4 py-2 flex items-center gap-2 border-b">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-4">
            <div className="bg-background rounded px-3 py-1 text-xs text-muted-foreground text-center">
              cveetje.nl/dashboard
            </div>
          </div>
        </div>

        {/* CV Preview Content */}
        <div className="bg-white p-4 md:p-8">
          <div
            className="mx-auto shadow-lg rounded overflow-hidden"
            style={{
              maxWidth: '500px',
              fontSize: '10px',
              lineHeight: '1.4',
            }}
          >
            {/* CV Header */}
            <div
              className="p-4 md:p-6 text-white relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
              }}
            >
              {/* Decorative circles */}
              <div
                className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-10"
                style={{ background: 'white' }}
              />
              <div
                className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10"
                style={{ background: 'white' }}
              />

              <div className="relative z-10 flex items-start gap-4">
                {/* Avatar placeholder */}
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center text-white/60 text-lg font-bold flex-shrink-0">
                  SJ
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold mb-0.5">Sophie Jansen</h2>
                  <p className="text-white/80 text-[10px] md:text-xs mb-2">Senior Marketing Manager</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/70 text-[9px]">
                    <span>sophie@email.nl</span>
                    <span>Amsterdam</span>
                    <span>+31 6 12345678</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CV Body */}
            <div className="p-4 md:p-6 bg-white space-y-4">
              {/* Professional Summary */}
              <div>
                <h3 className="font-bold text-[11px] md:text-xs text-[#1e3a5f] border-b border-[#1e3a5f]/20 pb-1 mb-2">
                  Profiel
                </h3>
                <p className="text-gray-600 text-[9px] md:text-[10px] leading-relaxed">
                  Resultaatgerichte marketing professional met 8+ jaar ervaring in digitale strategie
                  en merkpositionering. Bewezen track record in het verhogen van brand awareness en
                  het leiden van cross-functionele teams.
                </p>
              </div>

              {/* Experience */}
              <div>
                <h3 className="font-bold text-[11px] md:text-xs text-[#1e3a5f] border-b border-[#1e3a5f]/20 pb-1 mb-2">
                  Werkervaring
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-semibold text-[10px]">Senior Marketing Manager</span>
                      <span className="text-gray-500 text-[9px]">2021 - Heden</span>
                    </div>
                    <div className="text-[#2d5a87] text-[9px] mb-1">TechCorp Nederland</div>
                    <ul className="text-gray-600 text-[9px] space-y-0.5 list-disc list-inside">
                      <li>Leidde digitale transformatie met 40% groei in online engagement</li>
                      <li>Beheerde marketing budget van €2M+ met positieve ROI</li>
                    </ul>
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="font-semibold text-[10px]">Marketing Specialist</span>
                      <span className="text-gray-500 text-[9px]">2018 - 2021</span>
                    </div>
                    <div className="text-[#2d5a87] text-[9px] mb-1">Digital Agency BV</div>
                    <ul className="text-gray-600 text-[9px] space-y-0.5 list-disc list-inside">
                      <li>Ontwikkelde content strategie voor 15+ B2B klanten</li>
                      <li>Verhoogde lead generatie met 65% door SEO optimalisatie</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="font-bold text-[11px] md:text-xs text-[#1e3a5f] border-b border-[#1e3a5f]/20 pb-1 mb-2">
                  Vaardigheden
                </h3>
                <div className="flex flex-wrap gap-1">
                  {['Digital Marketing', 'SEO/SEA', 'Content Strategie', 'Team Leadership', 'Analytics', 'Branding'].map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-[8px] md:text-[9px] rounded-full"
                      style={{
                        background: '#1e3a5f15',
                        color: '#1e3a5f',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Education - Compact */}
              <div>
                <h3 className="font-bold text-[11px] md:text-xs text-[#1e3a5f] border-b border-[#1e3a5f]/20 pb-1 mb-2">
                  Opleiding
                </h3>
                <div className="flex justify-between text-[9px]">
                  <div>
                    <span className="font-semibold">MSc Marketing</span>
                    <span className="text-gray-500"> • Universiteit van Amsterdam</span>
                  </div>
                  <span className="text-gray-500">2016</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges showing features */}
      <div className="absolute -right-2 top-16 md:-right-4 md:top-20 hidden lg:block">
        <Badge variant="secondary" className="shadow-lg text-xs">
          🎯 Gefit op vacature
        </Badge>
      </div>
      <div className="absolute -left-2 top-1/3 md:-left-4 hidden lg:block">
        <Badge variant="secondary" className="shadow-lg text-xs">
          ✨ AI-gegenereerd
        </Badge>
      </div>
      <div className="absolute -right-2 bottom-1/4 md:-right-4 hidden lg:block">
        <Badge variant="secondary" className="shadow-lg text-xs">
          📄 PDF-ready
        </Badge>
      </div>
    </div>
  );
}

// Dashboard mockup showing the wizard interface
export function DashboardMockup() {
  return (
    <div className="bg-muted rounded-lg border shadow-xl overflow-hidden">
      {/* Browser top bar */}
      <div className="bg-muted-foreground/10 px-4 py-2 flex items-center gap-2 border-b">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-background rounded px-3 py-1 text-xs text-muted-foreground text-center">
            cveetje.nl/dashboard
          </div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="bg-background p-4 md:p-6">
        {/* Wizard steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">✓</div>
            <span className="text-sm font-medium hidden sm:inline">Profiel</span>
          </div>
          <div className="w-8 h-0.5 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">✓</div>
            <span className="text-sm font-medium hidden sm:inline">Vacature</span>
          </div>
          <div className="w-8 h-0.5 bg-primary" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
            <span className="text-sm font-medium hidden sm:inline">Stijl</span>
          </div>
          <div className="w-8 h-0.5 bg-muted-foreground/30" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">4</div>
            <span className="text-sm text-muted-foreground hidden sm:inline">Preview</span>
          </div>
        </div>

        {/* Style generation card */}
        <div className="bg-card rounded-lg border p-4 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg">🎨</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">Stijl Genereren</h4>
              <p className="text-xs text-muted-foreground">AI maakt een unieke stijl voor jou</p>
            </div>
          </div>

          {/* Style preview cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="aspect-[3/4] rounded border-2 border-primary bg-gradient-to-b from-[#1e3a5f] to-[#2d5a87] relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-white" />
              <div className="absolute top-1 right-1">
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                  <span className="text-[8px]">✓</span>
                </div>
              </div>
            </div>
            <div className="aspect-[3/4] rounded border bg-gradient-to-b from-gray-700 to-gray-800 relative overflow-hidden opacity-60">
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-white" />
            </div>
            <div className="aspect-[3/4] rounded border bg-gradient-to-b from-emerald-600 to-emerald-700 relative overflow-hidden opacity-60">
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-white" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 h-9 rounded bg-primary/10 flex items-center justify-center text-xs text-primary font-medium">
              ↻ Regenereer
            </div>
            <div className="flex-1 h-9 rounded bg-primary flex items-center justify-center text-xs text-primary-foreground font-medium">
              Verder →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
