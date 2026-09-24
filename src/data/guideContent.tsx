import React from 'react';
import { Flag, Navigation, Heart, Footprints, Zap, Users, TriangleAlert, ExternalLink } from 'lucide-react';

/* ---------- Instructions ---------- */

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-white/80 font-semibold">{children}</strong>
);

const Gold: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-[#c2a078] font-semibold">{children}</strong>
);

const Red: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="text-red-400 font-semibold">{children}</strong>
);

interface InstructionCard {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}

// Keep in step with GameCanvas: updateAlphaLeader (steering, stamina, crowding, hop) and processCollisions (bites).
const INSTRUCTIONS: InstructionCard[] = [
  {
    icon: <Flag className="w-4 h-4" />,
    title: 'The crossing',
    body: (
      <>
        You are the lead wildebeest of a herd. Swim across the Mara from the left bank and climb out through one of the two{' '}
        <Gold>green exit ramps</Gold> on the far side. The rest of that bank is a mud cliff you can&rsquo;t climb.
        There are 10 crossings, and at each one you lead a new herd across a more dangerous stretch of river, with more crocodiles and a stronger current.
      </>
    ),
  },
  {
    icon: <Navigation className="w-4 h-4" />,
    title: 'Steering',
    body: (
      <>
        Use <Key>WASD</Key> or the <Key>arrow keys</Key>, or point with the mouse: your wildebeest swims towards
        wherever you <Key>move</Key>, <Key>click</Key> or <Key>tap</Key> on the screen. Once you point, the mouse
        overrides the keys until your wildebeest reaches that spot.
      </>
    ),
  },
  {
    icon: <Heart className="w-4 h-4" />,
    title: 'Health & stamina',
    body: (
      <>
        Swimming uses <Gold>stamina</Gold>, more when you head upstream and far more in a crush of animals, and it
        doesn&rsquo;t refill during a crossing. Run low and you become exhausted: slow, and unable to hop. At zero
        you start to drown. <Gold>Health</Gold> is lost to bites, trampling and drowning, and only recovers on the
        bank. Let the current carry you too far downstream and you&rsquo;re <Red>swept away</Red>.
      </>
    ),
  },
  {
    icon: <Footprints className="w-4 h-4" />,
    title: 'Stampedes',
    body: (
      <>
        When three or more animals press in around you, you&rsquo;re caught in a <Gold>stampede</Gold>: you slow
        down, get trampled (losing health) and tire quickly. Hop or steer out of the crush.
      </>
    ),
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: 'Hopping',
    body: (
      <>
        Press <Key>Space</Key> or the <Key>Hop!</Key> button to hop while in the water. Each hop costs{' '}
        <Red>15% stamina</Red>. It gives a short lunge forward and shoves nearby animals aside, breaking up a
        stampede. Time it well and you leap clear over a crocodile&rsquo;s jaws.
      </>
    ),
  },
  {
    icon: <Users className="w-4 h-4" />,
    title: 'Stay with the herd',
    body: (
      <>
        There is safety in numbers. Stray too far from the others and you&rsquo;ll see an <Red>isolated</Red>{' '}
        warning: stalking crocodiles hunt lone swimmers and close in faster. Stay near the herd, but not in the
        crush.
      </>
    ),
  },
  {
    icon: <TriangleAlert className="w-4 h-4" />,
    title: 'Crocodiles',
    body: (
      <>
        Some crocodiles <Key>patrol</Key> back and forth, some <Key>stalk</Key> strays, and some <Key>lie still</Key>{' '}
        until they wake. Wide-open jaws mean they&rsquo;re ready to strike. A bite hurts and knocks you back, and a
        few bites are fatal. A crocodile that makes a kill has eaten, and ignores the herd for the rest of the crossing.
      </>
    ),
  },
];

export const InstructionsContent: React.FC = () => (
  <div className="space-y-3 text-xs leading-relaxed font-sans">
    {INSTRUCTIONS.map((card) => (
      <div key={card.title} className="bg-panel-raised p-4 rounded-xl border border-line flex gap-3">
        <div className="p-2 rounded-lg bg-panel text-[#c2a078] h-fit">{card.icon}</div>
        <div>
          <h4 className="font-display font-semibold text-[#c2a078] mb-1 text-sm">{card.title}</h4>
          <p className="text-white/65 leading-normal">{card.body}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ---------- About ---------- */

const ABOUT_PARAGRAPHS: React.ReactNode[] = [
  <>
    Cross is a collaboration between Nature Venture and Internet of Elephants.
    <br />
    Developed by Gautam Shah.
  </>,
  <>
    This was my first attempt at vibe coding a game and where I started to explore what was possible and what are the
    current limitations. Nature has millions of story lines that play out every day, and one of the most dramatic is the
    annual crossing of wildebeest across the Mara River in search of grazing land. This has been documented thousands of
    times on film, both long and short, but every part of it seemed perfect for a short game that tried to simulate the
    manic energy that surrounds it, and the very real dangers that lurk.
  </>,
  <>
    While the idea was mine, the game was built entirely by AI. Of course, there are many things we would love to have had
    the help of a biologist, an illustrator, a creative director, and a game developer to get exactly right.
  </>,
  <>
    What&rsquo;s exciting is that we didn&rsquo;t need a whole team of people to get started. We had an idea, some
    curiosity, a couple of computers and a self-imposed timeline of less than a week. So that&rsquo;s what we did. And
    we&rsquo;re pretty excited about what else we might be able to make this way.
  </>,
];

export const AboutContent: React.FC = () => (
  <div className="space-y-3 text-xs leading-relaxed font-sans">
    {ABOUT_PARAGRAPHS.map((para, i) => (
      <p key={i} className="text-white/65 leading-normal px-1">{para}</p>
    ))}
  </div>
);

/* ---------- References ---------- */

interface Reference {
  title: string;
  url: string;
  description: string;
}

const REFERENCES: { heading: string; items: Reference[] }[] = [
  {
    heading: 'Videos',
    items: [
      {
        title: 'BBC — Nature’s Great Events: The Great Migration',
        url: 'https://www.youtube.com/watch?v=AU2cgVStyQ0',
        description:
          'A classic BBC sequence showing the scale and drama of the Serengeti migration, including the enormous herds and the dangers they face along their journey.',
      },
      {
        title: 'National Geographic — Wildebeest Migration',
        url: 'https://education.nationalgeographic.org/resource/wildebeest-migration/',
        description:
          'A concise introduction to the Great Migration, explaining the seasonal cycle, the role of rainfall and fresh grass, and the dangers wildebeest encounter during river crossings.',
      },
    ],
  },
  {
    heading: 'Articles',
    items: [
      {
        title: 'National Geographic — How Wildebeest Reshape the Serengeti During Africa’s Great Migration',
        url: 'https://www.nationalgeographic.com/animals/article/wildebeest-great-migration-africa-serengeti',
        description:
          'An overview of the migration and its ecological importance, explaining how millions of wildebeest, zebra and gazelle follow rainfall and fresh vegetation through the Serengeti-Mara ecosystem.',
      },
      {
        title: 'National Geographic — The Greatest Show on Earth: Tracking the Wildebeest Migration Across Tanzania’s Serengeti',
        url: 'https://www.nationalgeographic.com/travel/article/greatest-show-earth-tracking-wildebeest-migration-across-tanzanias-serengeti',
        description:
          'A first-hand account of witnessing a Mara River crossing, including the remarkable hesitation and sudden collective decisions that precede a crossing.',
      },
      {
        title: 'National Geographic — Why the Wildebeest Is the Unlikely King of the Serengeti',
        url: 'https://www.nationalgeographic.com/magazine/article/why-the-wildebeest-is-the-unlikely-king-of-the-serengeti-feature',
        description:
          'A deeper look at wildebeest biology and their importance to the Serengeti ecosystem, placing the migration and river crossings within the broader annual cycle of the species.',
      },
      {
        title: 'Smithsonian Magazine — Join the Migration in the Serengeti',
        url: 'https://www.smithsonianmag.com/travel/join-the-migration-in-the-serengeti-11474629/',
        description:
          "An accessible introduction to one of the world's great animal migrations, covering the enormous herds, seasonal rains, predators and the challenges of crossing the Mara River.",
      },
      {
        title: 'National Geographic — How 2 Million Pounds of Rotting Flesh Helps the Serengeti',
        url: 'https://www.nationalgeographic.com/animals/article/wildebeest-serengeti-migration-carcasses',
        description:
          'An unexpected look at what happens when wildebeest die during river crossings. Their carcasses become an important source of nutrients for the Mara River ecosystem and its wildlife.',
      },
    ],
  },
  {
    heading: 'Scientific papers',
    items: [
      {
        title:
          'Holdo et al. — Annual Mass Drownings of the Serengeti Wildebeest Migration Influence Nutrient Cycling and Storage in the Mara River',
        url: 'https://pubmed.ncbi.nlm.nih.gov/28630330/',
        description:
          'A scientific study of the ecological consequences of wildebeest deaths during river crossings. The researchers found that thousands of carcasses can enter the Mara River each year, transferring enormous quantities of nutrients into the aquatic ecosystem.',
      },
      {
        title:
          'Boone, Thirgood & Hopcraft — Serengeti Wildebeest Migratory Patterns Modeled From Rainfall and New Vegetation Growth',
        url: 'https://esajournals.onlinelibrary.wiley.com/doi/10.1890/0012-9658%282006%2987%5B1987%3ASWMPMF%5D2.0.CO%3B2',
        description:
          'This study examines how wildebeest determine where to move during their annual migration. It shows the important roles that rainfall and the emergence of fresh vegetation play in shaping their movements.',
      },
      {
        title:
          'From Single Steps to Mass Migration: The Problem of Scale in the Movement Ecology of the Serengeti Wildebeest',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5882982/',
        description:
          'An exploration of how the movements and decisions of individual wildebeest combine to produce the spectacular behavior of an entire herd. It provides useful insight into the collective behavior behind the Great Migration.',
      },
    ],
  },
];

// Links always open in a new tab so the game is never navigated away from.
export const ReferencesContent: React.FC = () => (
  <div className="space-y-6 text-xs leading-relaxed font-sans">
    {REFERENCES.map((section) => (
      <section key={section.heading} className="space-y-3">
        <h4 className="font-display font-semibold text-[#c2a078] text-sm px-1">{section.heading}</h4>
        {section.items.map((ref) => (
          <div key={ref.url} className="bg-panel-raised p-4 rounded-xl border border-line">
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-sm text-white/85 hover:text-[#c2a078] underline decoration-white/25 hover:decoration-[#c2a078] underline-offset-2 transition-colors"
            >
              {ref.title}
              <ExternalLink className="inline w-3 h-3 ml-1 -mt-0.5 opacity-60" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <p className="text-white/65 leading-normal mt-1">{ref.description}</p>
          </div>
        ))}
      </section>
    ))}
  </div>
);
