import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, ChefHat } from "lucide-react";

const CANONICAL = "https://simplebakehub.lovable.app/guides/which-breads-are-gluten-free";
const TITLE = "Which Breads Are Gluten-Free? Sourdough, Rye, Pita & More";
const DESCRIPTION =
  "A clear, baker-friendly guide to which breads are actually gluten-free — sourdough, rye, pita, naan, Ezekiel, cornbread and more, with safe alternatives.";

type Verdict = "no" | "yes" | "sometimes";

interface BreadFAQ {
  id: string;
  question: string;
  verdict: Verdict;
  answer: string;
}

const faqs: BreadFAQ[] = [
  {
    id: "sourdough",
    question: "Is sourdough bread gluten-free?",
    verdict: "no",
    answer:
      "Traditional sourdough is made with wheat, rye or spelt flour, so it contains gluten. The long ferment breaks gluten down a little, but not enough to be safe for coeliacs or anyone with a wheat allergy. The good news: a proper gluten-free sourdough — made with a GF starter and flours like brown rice, sorghum, buckwheat or a quality GF blend — gives you the same tangy crumb without the wheat.",
  },
  {
    id: "ezekiel",
    question: "Is Ezekiel bread gluten-free?",
    verdict: "no",
    answer:
      "No. Ezekiel bread is made from sprouted wheat, barley, spelt and lentils. Sprouting changes the starch a little but does not remove gluten. If you're avoiding gluten, give it a miss.",
  },
  {
    id: "rye",
    question: "Is rye bread gluten-free?",
    verdict: "no",
    answer:
      "No. Rye is one of the three classic gluten grains (wheat, barley, rye), so traditional rye and pumpernickel loaves are off the menu. A GF \"rye-style\" loaf using caraway, molasses and buckwheat or teff can give you a similar dark, malty flavour.",
  },
  {
    id: "pita",
    question: "Is pita bread gluten-free?",
    verdict: "no",
    answer:
      "Standard pita is wheat-based and not gluten-free. Look for pitas made with chickpea, cassava or a GF flour blend — or bake your own GF flatbreads at home for a fresher pocket.",
  },
  {
    id: "naan",
    question: "Is naan bread gluten-free?",
    verdict: "no",
    answer:
      "Traditional naan uses wheat flour and yoghurt, so it contains gluten. GF naan recipes built around a blend of rice flour, tapioca and psyllium husk soften beautifully and char nicely on a hot pan.",
  },
  {
    id: "cornbread",
    question: "Is cornbread gluten-free?",
    verdict: "sometimes",
    answer:
      "It can be — but most classic cornbread recipes mix cornmeal with wheat flour. To be safe, make cornbread with 100% cornmeal (or cornmeal plus a GF flour blend) and check the label on any boxed mix.",
  },
  {
    id: "potato",
    question: "Is potato bread gluten-free?",
    verdict: "no",
    answer:
      "Despite the name, most shop-bought potato bread is mostly wheat flour with some mashed potato added. A truly GF potato loaf needs to be baked with a GF flour blend, potato and binding ingredients like psyllium or xanthan.",
  },
  {
    id: "keto",
    question: "Is keto bread gluten-free?",
    verdict: "sometimes",
    answer:
      "Often, but not always. Most keto breads use almond flour, coconut flour or psyllium — all naturally gluten-free. A few use vital wheat gluten to boost protein and structure, which is the opposite of gluten-free. Always check the ingredients.",
  },
  {
    id: "lebanese",
    question: "Is Lebanese bread gluten-free?",
    verdict: "no",
    answer:
      "No. Lebanese flatbread is a thin wheat-based bread similar to pita. A GF flatbread made with chickpea or cassava flour is the closest swap.",
  },
  {
    id: "subway",
    question: "Does Subway have gluten-free bread?",
    verdict: "sometimes",
    answer:
      "Availability varies by country and store. Some Subway locations stock a certified GF roll, but cross-contact in the prep area is a real risk because everything is assembled on the same surface. If you're highly sensitive or coeliac, ring ahead and ask about their handling.",
  },
];

const verdictMeta: Record<Verdict, { label: string; Icon: typeof CheckCircle2; classes: string }> = {
  yes: { label: "Gluten-free", Icon: CheckCircle2, classes: "text-success" },
  no: { label: "Contains gluten", Icon: XCircle, classes: "text-destructive" },
  sometimes: { label: "It depends", Icon: AlertTriangle, classes: "text-warning" },
};

const usePageMeta = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = TITLE;

    const setMeta = (selector: string, attr: string, name: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    const description = setMeta('meta[name="description"]', "name", "description", DESCRIPTION);
    const ogTitle = setMeta('meta[property="og:title"]', "property", "og:title", TITLE);
    const ogDesc = setMeta('meta[property="og:description"]', "property", "og:description", DESCRIPTION);
    const ogUrl = setMeta('meta[property="og:url"]', "property", "og:url", CANONICAL);
    const ogType = setMeta('meta[property="og:type"]', "property", "og:type", "article");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.getAttribute("href");
    canonical.setAttribute("href", CANONICAL);

    const ldScript = document.createElement("script");
    ldScript.type = "application/ld+json";
    ldScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
    document.head.appendChild(ldScript);

    return () => {
      document.title = previousTitle;
      document.head.removeChild(ldScript);
      if (createdCanonical && canonical?.parentNode) {
        canonical.parentNode.removeChild(canonical);
      } else if (canonical && previousCanonical !== null) {
        canonical.setAttribute("href", previousCanonical);
      }
      // Leave generic og/description tags in place — index.html sets sitewide defaults.
      void description;
      void ogTitle;
      void ogDesc;
      void ogUrl;
      void ogType;
    };
  }, []);
};

const GuideWhichBreadsGlutenFree = () => {
  usePageMeta();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <article>
          <header className="mb-10 text-center">
            <div className="flex justify-center mb-4">
              <ChefHat className="h-12 w-12 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Which breads are actually gluten-free?
            </h1>
            <p className="text-lg text-muted-foreground">
              A straight-talking guide for anyone navigating the bread aisle —
              sourdough, rye, pita, naan, Ezekiel and more, demystified by bakers.
            </p>
          </header>

          <section className="mb-10">
            <Card className="glass-card">
              <CardContent className="p-6 space-y-3 text-foreground">
                <p>
                  Short answer: most traditional breads are made with wheat, rye
                  or barley, so they contain gluten. A handful — like properly
                  made GF sourdough, chickpea flatbreads and 100% cornmeal
                  cornbread — are genuinely safe.
                </p>
                <p className="text-muted-foreground">
                  Below, we go through the breads people ask about most often,
                  with a quick verdict and what to look for instead.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            {faqs.map(({ id, question, verdict, answer }) => {
              const { label, Icon, classes } = verdictMeta[verdict];
              return (
                <Card key={id} id={id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-6 w-6 mt-0.5 shrink-0 ${classes}`} aria-hidden="true" />
                      <div>
                        <CardTitle className="text-xl text-foreground">
                          {question}
                        </CardTitle>
                        <p className={`text-sm font-medium mt-1 ${classes}`}>{label}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/90 leading-relaxed">{answer}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="mt-12">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl">Ready to bake your own?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground/90">
                  If you'd love a tangy loaf you can actually eat, our gluten-free
                  sourdough tools walk you through every step — from waking up a
                  starter to shaping and baking.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <Link to="/starter-guide">Start a GF sourdough starter</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/recipe-generator">Generate a GF bread recipe</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </article>
      </main>
    </div>
  );
};

export default GuideWhichBreadsGlutenFree;