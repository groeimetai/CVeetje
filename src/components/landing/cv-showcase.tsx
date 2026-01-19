'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  User,
  Building2,
  MapPin,
  TrendingUp,
  Target,
  Shield,
  Sparkles,
  Zap,
  Star,
} from 'lucide-react';

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

// Profile Selection mockup showing saved profiles
export function ProfileSelectionMockup() {
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

      {/* Content */}
      <div className="bg-background p-4 md:p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Kies je Profiel
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Selecteer een opgeslagen profiel of maak een nieuwe aan
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Saved profiles */}
            <div className="space-y-2">
              {/* Selected profile */}
              <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                  SJ
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">Sophie Jansen</span>
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Marketing Professional</span>
                </div>
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>

              {/* Other profiles */}
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-600">
                  SJ
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">Sophie - Tech Focus</span>
                  <span className="text-xs text-muted-foreground">Product Management</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-600">
                  SJ
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">Sophie - Freelance</span>
                  <span className="text-xs text-muted-foreground">Consultant</span>
                </div>
              </div>
            </div>

            {/* New profile button */}
            <button className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed text-muted-foreground hover:text-foreground hover:border-primary transition-colors text-sm">
              <span className="text-lg">+</span>
              Nieuw profiel aanmaken
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Job Analysis mockup with salary estimate
export function JobAnalysisMockup() {
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

      {/* Content */}
      <div className="bg-background p-4 md:p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Vacature geanalyseerd</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job info */}
            <div className="rounded-lg border p-3 space-y-2">
              <h3 className="font-semibold">Senior Marketing Manager</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                TechCorp Nederland
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Amsterdam
                </span>
                <Badge variant="secondary" className="text-xs">Marketing</Badge>
              </div>
            </div>

            {/* Keywords extracted */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Keywords gevonden</span>
              <div className="flex flex-wrap gap-1">
                {['Digital Marketing', 'SEO', 'Team Leadership', 'B2B', 'Analytics', 'Content'].map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Salary Estimate */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">AI Salaris Inschatting</span>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Hoge betrouwbaarheid
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-semibold text-lg">€65.000 - €85.000</span>
                <span className="text-xs text-muted-foreground">/jaar</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Gebaseerd op functie, ervaring en locatie Amsterdam
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Style Generator mockup with creativity levels
export function StyleGeneratorMockup() {
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

      {/* Content */}
      <div className="bg-background p-4 md:p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Stijl Genereren
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Kies je creativiteitsniveau en genereer een unieke stijl
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Creativity levels */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Creativiteitsniveau</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg border text-center cursor-pointer hover:bg-muted/50">
                  <Shield className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-xs">Veilig</span>
                </div>
                <div className="p-2 rounded-lg border-2 border-primary bg-primary/5 text-center">
                  <Zap className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <span className="text-xs font-medium">Gebalanceerd</span>
                </div>
                <div className="p-2 rounded-lg border text-center cursor-pointer hover:bg-muted/50">
                  <Sparkles className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-xs">Creatief</span>
                </div>
              </div>
            </div>

            {/* Style preview cards */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Gegenereerde stijl</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="aspect-[3/4] rounded-lg border-2 border-primary bg-gradient-to-b from-[#1e3a5f] to-[#2d5a87] relative overflow-hidden shadow-md">
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-white" />
                  <div className="absolute inset-x-2 top-2 h-3 bg-white/20 rounded" />
                  <div className="absolute inset-x-2 bottom-2 space-y-1">
                    <div className="h-1 bg-gray-200 rounded w-3/4" />
                    <div className="h-1 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="absolute top-1 right-1">
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <div className="aspect-[3/4] rounded-lg border bg-gradient-to-b from-gray-700 to-gray-800 relative overflow-hidden opacity-50">
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-white" />
                  <div className="absolute inset-x-2 top-2 h-3 bg-white/20 rounded" />
                </div>
                <div className="aspect-[3/4] rounded-lg border bg-gradient-to-b from-emerald-600 to-emerald-700 relative overflow-hidden opacity-50">
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-white" />
                  <div className="absolute inset-x-2 top-2 h-3 bg-white/20 rounded" />
                </div>
              </div>
            </div>

            {/* Style description */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium mb-1">&quot;Corporate Maritime&quot;</p>
              <p className="text-xs text-muted-foreground">
                Professionele stijl met diepe blauwtinten, perfect voor marketing en corporate rollen.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <div className="flex-1 h-9 rounded-lg bg-muted flex items-center justify-center text-xs font-medium cursor-pointer hover:bg-muted/80">
                ↻ Regenereer
              </div>
              <div className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                Verder →
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// LinkedIn Export mockup showing generated LinkedIn content
export function LinkedInExportMockup() {
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
            cveetje.nl/profiles
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-background p-4 md:p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#0077b5] flex items-center justify-center">
                <span className="text-white font-bold text-sm">in</span>
              </div>
              <div>
                <CardTitle className="text-base">LinkedIn Profiel Content</CardTitle>
                <p className="text-xs text-muted-foreground">Geoptimaliseerd voor zoekvindingbaarheid</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Headline */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Headline</span>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  <span>📋</span> Kopieer
                </button>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm">
                Senior Marketing Manager | Digital Strategy & Brand Growth | Helping companies increase engagement by 40%+
              </div>
            </div>

            {/* About preview */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Over mij</span>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  <span>📋</span> Kopieer
                </button>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground line-clamp-3">
                🚀 Ik help bedrijven groeien door data-gedreven marketing strategieën.

                Met 8+ jaar ervaring in digitale marketing heb ik teams geleid die...
              </div>
              <span className="text-xs text-muted-foreground">+ 800 tekens meer</span>
            </div>

            {/* Experience description */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Werkervaring beschrijvingen</span>
              <div className="space-y-2">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">Senior Marketing Manager</span>
                    <button className="text-xs text-primary hover:underline">📋</button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    • Leidde digitale transformatie resulterend in 40% groei in online engagement
                    • Beheerde €2M+ marketing budget met 150% ROI...
                  </p>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aanbevolen skills</span>
              <div className="flex flex-wrap gap-1">
                {['Digital Marketing', 'SEO', 'Content Strategy', 'Team Leadership', 'Analytics'].map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                <Badge variant="outline" className="text-xs">+5 meer</Badge>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>💡</span>
                <span className="font-medium text-sm text-amber-800">Profiel tips</span>
              </div>
              <ul className="text-xs text-amber-700 space-y-1">
                <li>• Voeg een professionele profielfoto toe</li>
                <li>• Vraag 3+ aanbevelingen aan ex-collega&apos;s</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Keep the old DashboardMockup for backwards compatibility, but make it an alias
export function DashboardMockup() {
  return <StyleGeneratorMockup />;
}
